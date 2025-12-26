import { Button } from "@/components/ui/button";


export default function Home() {
  return (
    <div className="pt-16">
      Welcome to Splitr!
      <br />
      The smartest way to split bills and expenses with friends.
      <Button variant={"destructive"} className="cursor-pointer">Subfast</Button>
    </div>
  );
}
