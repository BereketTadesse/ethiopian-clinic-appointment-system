import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "CareSync Ethiopia | Clinic & Medical Appointment Portal",
  description: "Seamless healthcare appointments, family medical profiles, and digital clinic records across Ethiopia.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }} suppressHydrationWarning>
            <Navbar />
            <main style={{ flex: 1 }} suppressHydrationWarning>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
