
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    placeholder?: string;
}

export function DateTimePicker({ date, setDate, placeholder = "日時を選択" }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
    const [timeValue, setTimeValue] = React.useState<string>(
        date ? format(date, "HH:mm") : "00:00"
    );

    React.useEffect(() => {
        setSelectedDate(date);
        if (date) {
            setTimeValue(format(date, "HH:mm"));
        }
    }, [date]);

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) {
            setSelectedDate(undefined);
            setDate(undefined);
            return;
        }

        const [hours, minutes] = timeValue.split(":").map(Number);
        const updatedDate = new Date(newDate);
        updatedDate.setHours(hours);
        updatedDate.setMinutes(minutes);

        setSelectedDate(updatedDate);
        setDate(updatedDate);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        setTimeValue(newTime);

        if (selectedDate) {
            const [hours, minutes] = newTime.split(":").map(Number);
            const updatedDate = new Date(selectedDate);
            updatedDate.setHours(hours);
            updatedDate.setMinutes(minutes);
            setDate(updatedDate);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {date ? format(date, "yyyy/MM/dd HH:mm") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                <div className="p-3 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">時間:</span>
                        <Input
                            type="time"
                            value={timeValue}
                            onChange={handleTimeChange}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
