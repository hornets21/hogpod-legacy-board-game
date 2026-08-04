import "./globals.css";

export const metadata = {
  title: "ห้องแห่งความลับ — โรงเรียนไสยศาสตร์ฮอกปด",
  description:
    "บอร์ดเกมบันไดงูสุดมันส์ มี 4 บ้าน กระดาน 90 ช่อง มอนสเตอร์ สกิล ยา และสัตว์วิเศษ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
