import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Orkut Federated — Foundation",
  description: "An independent, research-stage federated social network project.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
