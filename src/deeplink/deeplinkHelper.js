/**
 * Deep Link Helper untuk E-Wallet & Mobile Banking Indonesia
 * Mendukung pembukaan aplikasi langsung (DANA, GoPay, OVO, ShopeePay, BCA, BTN, Mandiri, BRI)
 * dan auto-copy nominal ke clipboard untuk pembayaran instan tanpa friksi.
 */

export const PAYMENT_APPS = {
  DANA: {
    id: 'DANA',
    name: 'DANA',
    type: 'ewallet',
    scheme: 'dana://',
    webUrl: 'https://link.dana.id/',
    badgeColor: '#118eea',
    textColor: '#ffffff',
    makeUrl: (phone, amount) => {
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      const amt = Math.max(0, Math.round(Number(amount) || 0));
      if (cleanPhone) {
        return `https://link.dana.id/transfer?phoneNumber=${cleanPhone}&amount=${amt}`;
      }
      return 'https://link.dana.id/';
    }
  },
  GOPAY: {
    id: 'GOPAY',
    name: 'GoPay',
    type: 'ewallet',
    scheme: 'gojek://gopay',
    webUrl: 'https://gopay.co.id/',
    badgeColor: '#00aa13',
    textColor: '#ffffff',
    makeUrl: () => 'gojek://gopay'
  },
  OVO: {
    id: 'OVO',
    name: 'OVO',
    type: 'ewallet',
    scheme: 'ovo://',
    webUrl: 'https://www.ovo.id/',
    badgeColor: '#4c3494',
    textColor: '#ffffff',
    makeUrl: () => 'ovo://'
  },
  SHOPEEPAY: {
    id: 'SHOPEEPAY',
    name: 'ShopeePay',
    type: 'ewallet',
    scheme: 'shopeepay://',
    webUrl: 'https://shopee.co.id/m/shopeepay',
    badgeColor: '#ee4d2d',
    textColor: '#ffffff',
    makeUrl: () => 'shopeepay://'
  },
  BCA: {
    id: 'BCA',
    name: 'BCA Mobile',
    type: 'bank',
    scheme: 'bca://',
    webUrl: 'https://www.bca.co.id/',
    badgeColor: '#005eaa',
    textColor: '#ffffff',
    makeUrl: () => 'bca://'
  },
  BTN: {
    id: 'BTN',
    name: 'BTN Mobile',
    type: 'bank',
    scheme: 'btnmobile://',
    webUrl: 'https://www.btn.co.id/',
    badgeColor: '#0a3b8b',
    textColor: '#ffffff',
    makeUrl: () => 'btnmobile://'
  },
  MANDIRI: {
    id: 'MANDIRI',
    name: 'Livin by Mandiri',
    type: 'bank',
    scheme: 'bankmandiri://',
    webUrl: 'https://bankmandiri.co.id/',
    badgeColor: '#002d62',
    textColor: '#ffffff',
    makeUrl: () => 'bankmandiri://'
  },
  BRI: {
    id: 'BRI',
    name: 'BRImo',
    type: 'bank',
    scheme: 'brimo://',
    webUrl: 'https://bri.co.id/',
    badgeColor: '#00529c',
    textColor: '#ffffff',
    makeUrl: () => 'brimo://'
  }
};

/**
 * Deteksi aplikasi e-wallet / bank dari string input nama bank
 */
export function detectPaymentApp(bankName) {
  if (!bankName || typeof bankName !== 'string') return PAYMENT_APPS.DANA;
  const upper = bankName.toUpperCase();
  for (const key of Object.keys(PAYMENT_APPS)) {
    if (upper.includes(key)) {
      return PAYMENT_APPS[key];
    }
  }
  return PAYMENT_APPS.DANA;
}

/**
 * Menghasilkan tautan deep link untuk pembayaran
 */
export function getPaymentDeepLink(bankName, accountNumber, amount) {
  const app = detectPaymentApp(bankName);
  return app.makeUrl(accountNumber, amount);
}
