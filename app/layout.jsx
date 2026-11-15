import "./globals.css";

export const metadata = {
  title: "Atmos — Weather, considered.",
  description: "A premium weather dashboard with a transparent weather API inspector."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f2"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
