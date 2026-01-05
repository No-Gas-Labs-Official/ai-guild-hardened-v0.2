#!/bin/bash

# Flashware v1.0 - User Action Monitoring Script
# Monitors blockchain for user wallet actions and updates status page

set -e

# Configuration
SUI_RPC="https://fullnode.testnet.sui.io"
MONITOR_INTERVAL=5  # seconds
TIMEOUT=1800        # 30 minutes
PACKAGE_ID="$1"
SESSION_ID="$2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] MONITOR: $1${NC}"
}

# Update status page
update_status() {
    local status_data="$1"
    curl -s -X POST "https://flashware-status.vercel.app/api/status/$SESSION_ID" \
        -H "Content-Type: application/json" \
        -d "$status_data" \
        2>/dev/null || log "Failed to update status"
}

# Check wallet connection (by checking owned objects)
check_wallet_connection() {
    local user_address="$1"
    
    # Query owned objects
    objects_response=$(curl -s -X POST "$SUI_RPC" \
        -H "Content-Type: application/json" \
        -d "{&quot;jsonrpc&quot;:&quot;2.0&quot;,&quot;id&quot;:1,&quot;method&quot;:&quot;suix_getOwnedObjects&quot;,&quot;params&quot;:[&quot;$user_address&quot;,{&quot;limit&quot;:1}]}")
    
    # Check if user has any objects (basic connection check)
    object_count=$(echo "$objects_response" | jq -r '.result.data | length // 0')
    
    if [ "$object_count" -gt 0 ]; then
        log "✓ Wallet connected: $user_address"
        update_status '{"walletConnected": true, "walletAddress": "'$user_address'"}'
        return 0
    else
        return 1
    fi
}

# Check for strategy deployment (new packages published by user)
check_strategy_deployment() {
    local user_address="$1"
    
    # Get user's UpgradeCap objects (indicates published packages)
    upgrade_caps=$(sui client objects --json 2>/dev/null | jq '[.[] | select(.type | contains("UpgradeCap"))] | length')
    
    if [ "$upgrade_caps" -gt 0 ]; then
        # Get the latest package
        latest_package=$(sui client objects --json 2>/dev/null | jq -r '.[0].data.content.fields.package // empty')
        
        if [ -n "$latest_package" ]; then
            log "✓ Strategy deployed: $latest_package"
            update_status '{"strategyDeployed": true, "strategyPackageId": "'$latest_package'"}'
            return 0
        fi
    fi
    
    return 1
}

# Check for flash loan execution (recent transactions)
check_flash_loan_execution() {
    local user_address="$1"
    
    # Get recent transactions
    recent_txs=$(sui client tx-blocks --address "$user_address" --limit 5 --json 2>/dev/null)
    
    if [ -n "$recent_txs" ]; then
        # Look for transactions with our package
        flash_loan_tx=$(echo "$recent_txs" | jq -r '.[] | select(.effects.events[]? | .type | contains("flash_loan")) | .digest' | head -1)
        
        if [ -n "$flash_loan_tx" ]; then
            log "✓ Flash loan executed: $flash_loan_tx"
            
            # Extract balance changes
            balance_changes=$(sui client tx-block "$flash_loan_tx" --json 2>/dev/null | jq '.balanceChanges // {}')
            
            # Calculate profit/loss (simplified)
            sui_change=$(echo "$balance_changes" | jq -r '.[] | select(.coinType | contains("0x2::sui::SUI")) | .amount // 0' | head -1)
            
            if [ -n "$sui_change" ]; then
                # Convert to human-readable format (divide by 10^9)
                profit_loss=$(echo "scale=4; $sui_change / 1000000000" | bc -l)
                log "Balance change: $profit_loss SUI"
                
                update_status '{"strategyExecuted": true, "transactionHash": "'$flash_loan_tx'", "profit": "'$profit_loss'"}'
            else
                update_status '{"strategyExecuted": true, "transactionHash": "'$flash_loan_tx'"}'
            fi
            
            return 0
        fi
    fi
    
    return 1
}

# Get user address from recent activity or configuration
get_user_address() {
    # Try to get from monitoring session or recent transactions
    # For now, we'll monitor all recent transactions on testnet
    
    # This is a placeholder - in a real implementation, you'd
    # store the user address when they first connect
    
    echo ""
}

# Monitor blockchain for user actions
monitor_blockchain() {
    local start_time=$(date +%s)
    local user_address=""
    
    log "Starting blockchain monitoring for session: $SESSION_ID"
    log "Package ID: $PACKAGE_ID"
    log "Timeout: ${TIMEOUT}s"
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Check timeout
        if [ $elapsed -gt $TIMEOUT ]; then
            log "⏰ Monitoring timeout reached (${TIMEOUT}s)"
            update_status '{"status": "timeout", "message": "Monitoring timeout reached"}'
            break
        fi
        
        # If we don't have user address yet, try to detect it
        if [ -z "$user_address" ]; then
            # This would be enhanced in a real implementation
            # For now, we'll skip this step and assume user connects via frontend
            log "Waiting for wallet connection via frontend..."
        else
            # Check for strategy deployment
            if check_strategy_deployment "$user_address"; then
                # Strategy deployed, now check for execution
                if check_flash_loan_execution "$user_address"; then
                    log "🎉 Mission complete! User successfully executed flash loan strategy."
                    update_status '{"status": "completed", "message": "Strategy executed successfully"}'
                    break
                fi
            fi
        fi
        
        # Sleep before next check
        sleep $MONITOR_INTERVAL
    done
}

# Enhanced monitoring with status page polling
monitor_with_status_page() {
    local start_time=$(date +%s)
    
    log "Starting enhanced monitoring with status page integration"
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        # Check timeout
        if [ $elapsed -gt $TIMEOUT ]; then
            log "⏰ Monitoring timeout reached"
            update_status '{"status": "timeout", "message": "30-minute timeout reached"}'
            break
        fi
        
        # Get current status from status page
        status_response=$(curl -s "https://flashware-status.vercel.app/api/status/$SESSION_ID" 2>/dev/null)
        
        if [ -n "$status_response" ]; then
            wallet_connected=$(echo "$status_response" | jq -r '.walletConnected // false')
            strategy_deployed=$(echo "$status_response" | jq -r '.strategyDeployed // false')
            strategy_executed=$(echo "$status_response" | jq -r '.strategyExecuted // false')
            wallet_address=$(echo "$status_response" | jq -r '.walletAddress // empty')
            
            log "Status check - Wallet: $wallet_connected, Deployed: $strategy_deployed, Executed: $strategy_executed"
            
            # If wallet connected and we have address, monitor for on-chain activity
            if [ "$wallet_connected" = "true" ] && [ -n "$wallet_address" ]; then
                # Check for strategy deployment if not already deployed
                if [ "$strategy_deployed" = "false" ]; then
                    if check_strategy_deployment "$wallet_address"; then
                        log "Strategy deployment detected!"
                    fi
                fi
                
                # Check for execution if deployed but not executed
                if [ "$strategy_deployed" = "true" ] && [ "$strategy_executed" = "false" ]; then
                    if check_flash_loan_execution "$wallet_address"; then
                        log "🎉 Flash loan execution detected! Mission complete!"
                        update_status '{"status": "completed", "message": "Successfully executed flash loan strategy"}'
                        break
                    fi
                fi
            fi
        fi
        
        # Sleep before next check
        sleep $MONITOR_INTERVAL
    done
}

# Cleanup function
cleanup() {
    log "Cleaning up monitoring process..."
    update_status '{"status": "stopped", "message": "Monitoring stopped"}'
    exit 0
}

# Signal handlers
trap cleanup SIGINT SIGTERM

# Check dependencies
if ! command -v jq &> /dev/null; then
    log "ERROR: jq is required for monitoring. Please install jq."
    exit 1
fi

if ! command -v sui &> /dev/null; then
    log "ERROR: Sui CLI is required for monitoring. Please install Sui CLI."
    exit 1
fi

if ! command -v curl &> /dev/null; then
    log "ERROR: curl is required for monitoring. Please install curl."
    exit 1
fi

# Check arguments
if [ -z "$PACKAGE_ID" ] || [ -z "$SESSION_ID" ]; then
    log "Usage: $0 <package_id> <session_id>"
    exit 1
fi

# Initial status update
update_status '{"monitoring": true, "sessionId": "'$SESSION_ID'", "packageId": "'$PACKAGE_ID'"}'

# Start monitoring
log "Flashware monitoring daemon started"
log "Package ID: $PACKAGE_ID"
log "Session ID: $SESSION_ID"
log "Monitor interval: ${MONITOR_INTERVAL}s"
log "Timeout: ${TIMEOUT}s"

# Start enhanced monitoring
monitor_with_status_page

log "Monitoring daemon completed"