const toMinutes = (time) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
};

const hasOverlapInRanges = (ranges = []) => {
    const sorted = ranges
        .map((item) => ({
            start: toMinutes(item.startTime),
            end: toMinutes(item.endTime)
        }))
        .sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].end > sorted[i + 1].start)
            return true;
    }

    return false;
};

export const validateWeeklySchedule = (weeklySchedule = []) => {
    for (const dayItem of weeklySchedule) {
        const classes = Array.isArray(dayItem.classes) ? dayItem.classes : [];
        const freeSlots = Array.isArray(dayItem.freeSlots) ? dayItem.freeSlots : [];

        const hasInvalidClassRange = classes.some(
            (item) =>
                !item.courseName?.trim() ||
                !item.startTime ||
                !item.endTime ||
                item.startTime >= item.endTime
        );

        if (hasInvalidClassRange)
            return `${dayItem.day} class end time must be later than start time`;

        const hasInvalidFreeSlotRange = freeSlots.some(
            (item) =>
                !item.startTime ||
                !item.endTime ||
                item.startTime >= item.endTime
        );

        if (hasInvalidFreeSlotRange)
            return `${dayItem.day} free slot end time must be later than start time`;

        if (hasOverlapInRanges(classes))
            return `${dayItem.day} classes cannot overlap`;

        if (hasOverlapInRanges(freeSlots))
            return `${dayItem.day} free slots cannot overlap`;

        for (const classItem of classes) {
            const classStart = toMinutes(classItem.startTime);
            const classEnd = toMinutes(classItem.endTime);

            for (const slot of freeSlots) {
                const slotStart = toMinutes(slot.startTime);
                const slotEnd = toMinutes(slot.endTime);

                const overlaps = classStart < slotEnd && slotStart < classEnd;

                if (overlaps) 
                    return `${dayItem.day} class and free slot cannot overlap`;
                
            }
        }
    }

    return null;
};
