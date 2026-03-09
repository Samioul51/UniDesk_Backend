export const toMinuteTime = (date) => {
    const x = new Date(date);
    x.setSeconds(0, 0);
    return x.getTime();
};