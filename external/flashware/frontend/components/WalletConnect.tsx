import { ConnectButton, useWallet } from '@suiet/wallet-kit'
import { useEffect } from 'react'
import { useFlashwareStore } from '../lib/store'

export default function WalletConnect() {
  const { connected, address, signAndExecuteTransactionBlock } = useWallet()
  const { setWalletConnected, setUserAddress } = useFlashwareStore()

  useEffect(() => {
    setWalletConnected(connected)
    if (connected && address) {
      setUserAddress(address)
    }
  }, [connected, address, setWalletConnected, setUserAddress])

  return (
    <div className="space-y-4">
      <h3 className="cyber-text text-lg font-semibold">Wallet</h3>
      
      {connected ? (
        <div className="p-3 bg-slate-800 rounded border border-cyan-400/20">
          <div className="text-xs text-gray-400 mb-1">Connected</div>
          <div className="text-sm text-cyber-cyan font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-400">
          Connect wallet to deploy strategies
        </div>
      )}
      
      <ConnectButton
        className="w-full cyber-border bg-slate-800 hover:bg-slate-700 text-cyber-cyan py-2 px-4 rounded text-sm font-medium transition-all"
      />
    </div>
  )
}