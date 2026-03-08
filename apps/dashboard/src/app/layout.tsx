import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "mindOS Dashboard",
	description: "Manage your AI memory engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<nav>
					<div className="nav-inner">
						<span className="logo">mindOS</span>
						<a href="/">Overview</a>
						<a href="/memories">Memories</a>
						<a href="/settings">Settings</a>
					</div>
				</nav>
				<main className="container">{children}</main>
			</body>
		</html>
	);
}
