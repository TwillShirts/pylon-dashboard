import './globals.css';

export const metadata = {
  title: 'Τζίρος Καταστημάτων',
  description: 'Ημερήσιος τζίρος ανά κατάστημα, live από το PYLON',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fcfcfb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
