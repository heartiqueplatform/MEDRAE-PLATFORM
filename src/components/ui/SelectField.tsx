// src/components/ui/SelectField.tsx
import * as React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SelectOption {
    value: string;
    label: string;
    /** Optional — render a custom icon on the left of the item */
    icon?: React.ComponentType<{ className?: string }>;
}

export interface SelectFieldProps {
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    /** Extra classes on the trigger button */
    triggerClassName?: string;
    /** Extra classes on the popover content */
    contentClassName?: string;
    disabled?: boolean;
    /** Optional aria-label */
    ariaLabel?: string;
}

/* ------------------------------------------------------------------ */
/*  SelectField — design-system styled Select                         */
/*                                                                    */
/*  Uses Radix Select under the hood. Call sites get a flat, no-     */
/*  border, no-shadow, GitHub-palette dropdown that matches every    */
/*  other control in the app.                                         */
/*                                                                    */
/*  Usage:                                                            */
/*    <SelectField                                                    */
/*      value={qType}                                                 */
/*      onValueChange={setQType}                                      */
/*      options={[                                                    */
/*        { value: "multiple_choice", label: "Multiple Choice" },     */
/*        { value: "multiple_select", label: "Multiple Select" },     */
/*      ]}                                                            */
/*    />                                                              */
/* ------------------------------------------------------------------ */

export function SelectField({
    value,
    onValueChange,
    options,
    placeholder,
    triggerClassName = "",
    contentClassName = "",
    disabled,
    ariaLabel,
}: SelectFieldProps) {
    return (
        <Select
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
        >
            <SelectTrigger
                aria-label={ariaLabel}
                className={`
                    h-10 w-full rounded-xl
                    bg-white dark:bg-[#161b22]
                    border-0 shadow-none
                    px-3 text-[13px] font-medium
                    text-slate-900 dark:text-white
                    ring-offset-0
                    focus:outline-none focus:ring-0 focus:ring-offset-0
                    data-[state=open]:ring-0
                    disabled:opacity-50
                    ${triggerClassName}
                `}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent
                className={`
                    rounded-xl
                    bg-white dark:bg-[#161b22]
                    border-0 shadow-none
                    text-slate-900 dark:text-white
                    ${contentClassName}
                `}
            >
                {options.map((opt) => {
                    const Icon = opt.icon;
                    return (
                        <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="
                                text-[12px] font-semibold
                                rounded-lg cursor-pointer
                                focus:bg-slate-100 dark:focus:bg-white/[0.06]
                                focus:text-slate-900 dark:focus:text-white
                            "
                        >
                            {Icon ? (
                                <span className="inline-flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                    {opt.label}
                                </span>
                            ) : (
                                opt.label
                            )}
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}

export default SelectField;