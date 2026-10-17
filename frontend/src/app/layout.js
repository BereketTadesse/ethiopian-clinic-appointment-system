import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ClinicProvider } from "../context/ClinicContext";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "Ethiopian Clinic & Medical Appointment Portal",
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
          <ClinicProvider>
            <Suspense fallback={null}>
              <AppShell>
                {children}
              </AppShell>
            </Suspense>
          </ClinicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
