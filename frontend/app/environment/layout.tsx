import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Environmental Risk Dashboard | Pawsitive Care",
    description: "Assess real-time environmental allergy risks for dogs using hybrid AI forecasting, OpenWeather APIs, and deep rule-based medical filtering.",
};

export default function EnvironmentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
