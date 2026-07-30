"use client";

import { useState } from "react";
import { getInitials } from "@/lib/shared-utils";

interface MemberAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  fallbackClassName?: string;
}

export default function MemberAvatar({
  name,
  avatarUrl,
  size = 36,
  fallbackClassName = "bg-gradient-to-br from-emerald-400 to-teal-600 text-white",
}: MemberAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  const fontSize = size * 0.4;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${fallbackClassName}`}
      style={{ width: size, height: size, fontSize }}
    >
      {getInitials(name)}
    </div>
  );
}
