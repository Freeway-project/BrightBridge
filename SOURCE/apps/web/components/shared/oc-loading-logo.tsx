import { cn } from "@/lib/utils";
import Image from "next/image";

type OCLoadingLogoProps = {
  className?: string;
};

export function OCLoadingLogo({ className }: OCLoadingLogoProps) {
  return (
    <Image
      src="/OCLoadingLogo.gif"
      alt="Okanagan College logo"
      width={64}
      height={64}
      unoptimized
      className={cn("object-contain", className)}
    />
  );
}
