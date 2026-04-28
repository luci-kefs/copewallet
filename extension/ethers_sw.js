// Service Worker için ethers wrapper
// ethers.umd.min.js globalThis'e doğrudan export eder (self.ethers değil)
// Bu wrapper importScripts sonrası self.ethers = { ...tüm exportlar } oluşturur

(function () {
  // ethers UMD'yi yükle — globalThis'e Wallet, Contract vs. yazar
  importScripts('ethers.umd.min.js');

  // ethers v6'nın UMD bundle'ı globalThis.ethers olarak değil,
  // globalThis.{Wallet, Contract, ...} şeklinde yazar.
  // Onu tek bir self.ethers objesinde topluyoruz.
  if (typeof self.Wallet !== 'undefined' && typeof self.ethers === 'undefined') {
    self.ethers = {
      Wallet: self.Wallet,
      Contract: self.Contract,
      JsonRpcProvider: self.JsonRpcProvider,
      formatEther: self.formatEther,
      parseEther: self.parseEther,
      formatUnits: self.formatUnits,
      parseUnits: self.parseUnits,
      getAddress: self.getAddress,
      isAddress: self.isAddress,
      hexlify: self.hexlify,
      toBeHex: self.toBeHex,
      toBigInt: self.toBigInt,
    };
  }
})();
