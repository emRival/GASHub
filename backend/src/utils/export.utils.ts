export const convertToCSV = (data: any[]) => {
    if (!data || !data.length) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value)).join(','))
    ];
    return csvRows.join('\n');
};

export const convertToJSON = (data: any[]) => {
    return JSON.stringify(data, null, 2);
};
