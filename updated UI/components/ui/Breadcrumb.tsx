import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
    items: { label: string; href: string, active?: boolean }[];
}

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
    return (
        <nav className={cn("flex", className)} aria-label="Breadcrumb" {...props}>
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={item.href} className="inline-flex items-center">
                            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
                            {isLast || item.active ? (
                                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                            ) : (
                                <Link href={item.href} className="text-sm font-medium text-gray-500 hover:text-indigo-600">
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
