import { TutoriaisSection } from "@/components/tutoriais/TutoriaisSection"

export default function TutoriaisPage() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
      <TutoriaisSection isStandalonePage={true} />
    </div>
  )
}
