import Image from "next/image";

type BrandMarkProps = {
  className?: string;
};

export default function BrandMark({ className = "" }: BrandMarkProps) {
  return <Image src="/icon.svg" alt="" width={48} height={48} className={className} />;
}
