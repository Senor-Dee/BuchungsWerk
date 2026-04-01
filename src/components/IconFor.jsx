// ══════════════════════════════════════════════════════════════════════════════
// IconFor – dynamischer Icon-Dispatcher (Name → Lucide-Icon)
// Extrahiert aus BuchungsWerk.jsx – Phase C5 Refactoring
// ══════════════════════════════════════════════════════════════════════════════
import React from "react";
import { Hash, BarChart2, BookOpen, Settings, Package, Megaphone, Tag, Users,
         Landmark, Briefcase, Factory, Building2, TrendingUp, AlertTriangle,
         Calendar, TrendingDown, Calculator, ClipboardList, Lock, Library,
         Layers, Wrench, Component, Fuel,
         Sun, Trees, Scissors, Dumbbell,
         FileText, PenLine, Download, Upload, Zap } from "lucide-react";

export const ICON_MAP = {
  Hash, BarChart2, BookOpen, Settings, Package, Megaphone, Tag, Users,
  Landmark, Briefcase, Factory, Building2, TrendingUp, AlertTriangle,
  Calendar, TrendingDown, Calculator, ClipboardList, Lock, Library,
  Layers, Wrench, Component, Fuel,
  Sun, Trees, Scissors, Dumbbell,
  FileText, PenLine, Download, Upload, Zap,
};

export function IconFor({ name, size = 14, ...props }) {
  const C = ICON_MAP[name];
  return C ? <C size={size} strokeWidth={1.5} {...props} /> : null;
}
