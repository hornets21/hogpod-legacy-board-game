import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";

export const metadata = {
  title: "ห้องแห่งความลับ — โรงเรียนไสยศาสตร์ฮอกปด",
  description:
    "บอร์ดเกมบันไดงูสุดมันส์ มี 4 บ้าน กระดาน 90 ช่อง มอนสเตอร์ สกิล ยา และสัตว์วิเศษ",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "ฮอกปด Board",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Kanit:ital,wght@0,300;0,400;0,600;0,700;0,900;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
