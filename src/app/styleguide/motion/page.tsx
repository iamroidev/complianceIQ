import { MotionLab } from "@/components/styleguide/motion/MotionLab";
import "./lab.css";

export const metadata = {
  title: "Motion lab — ComplianceIQ",
  description:
    "Every DESIGN.md §17 choreography item as a replayable demo with a reduced-motion toggle.",
};

export default function MotionPage() {
  return <MotionLab />;
}
