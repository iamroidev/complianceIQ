import { WelcomeGate } from "@/components/welcome/WelcomeGate";

export const metadata = {
  title: "Welcome · ComplianceIQ",
  description: "Choose your persona and explore the ComplianceIQ demo workspace.",
};

export default function WelcomePage() {
  return <WelcomeGate />;
}
