"use client";

import { useEffect, useState } from "react";

/* La fecha del visitante. null durante el render estático y la hidratación, para que no haya desajustes. */
export function useToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);
  return today;
}
