import {
    toCode39,
    toCode128,
    isEAN13,
    getCheckDigit,
    toEAN13,
} from "../app/barcode.js";

describe("getCheckDigit", () => {
    test("calculates correct check digit for 12-digit UPC", () => {
        // UPC-A: 04210000526 -> check digit 4
        expect(getCheckDigit("04210000526")).toBe(4);
    });

    test("calculates correct check digit for EAN-13", () => {
        // EAN-13: 590123412345 -> check digit 7
        expect(getCheckDigit("590123412345")).toBe(7);
    });

    test("calculates check digit 0 when sum is multiple of 10", () => {
        expect(getCheckDigit("000000000000")).toBe(0);
    });
});

describe("isEAN13", () => {
    test("returns true for valid 11-digit string", () => {
        expect(isEAN13("12345678901")).toBe(true);
    });

    test("returns true for valid 12-digit string with correct check digit", () => {
        const base = "04210000526";
        const checkDigit = getCheckDigit(base);
        expect(isEAN13(base + checkDigit)).toBe(true);
    });

    test("returns true for valid 13-digit string with correct check digit", () => {
        const base = "590123412345";
        const checkDigit = getCheckDigit(base);
        expect(isEAN13(base + checkDigit)).toBe(true);
    });

    test("returns false for non-numeric string", () => {
        expect(isEAN13("123456789AB")).toBe(false);
    });

    test("returns false for wrong length", () => {
        expect(isEAN13("123456789")).toBe(false);
        expect(isEAN13("12345678901234")).toBe(false);
    });

    test("returns false for invalid check digit", () => {
        expect(isEAN13("0421000052649")).toBe(false); // wrong check digit
    });
});

describe("toEAN13", () => {
    test("returns correct structure for valid 13-digit EAN", () => {
        const result = toEAN13("5901234123457");
        expect(result).toHaveProperty("arr");
        expect(result).toHaveProperty("sizes");
        expect(result).toHaveProperty("length");
        expect(result.length).toBe(95);
    });

    test("arr has correct number of elements", () => {
        const result = toEAN13("5901234123457");
        // Start (1) + 6 digits + Middle (1) + 6 digits + End (1) = 15
        expect(result.arr.length).toBe(15);
    });

    test("sizes array has correct length", () => {
        const result = toEAN13("5901234123457");
        expect(result.sizes.length).toBe(15);
    });
});

describe("toCode128", () => {
    test("returns correct structure for numeric string >= 4 chars", () => {
        const result = toCode128("1234");
        expect(result).toHaveProperty("arr");
        expect(result).toHaveProperty("sizes");
        expect(result).toHaveProperty("length");
    });

    test("uses Code128-C for long numeric strings", () => {
        const result = toCode128("123456");
        // Start C (1) + 3 pairs + checksum (1) + stop (1) + terminator (1) = 7
        expect(result.arr[0]).toBe(1692); // Start C
    });

    test("uses Code128-B for alphanumeric strings", () => {
        const result = toCode128("ABC");
        expect(result.arr[0]).toBe(1680); // Start B
    });

    test("throws for out-of-bounds characters", () => {
        expect(() => toCode128("\x00")).toThrow("OOB");
    });

    test("handles odd-length numeric strings", () => {
        const result = toCode128("12345");
        expect(result).toHaveProperty("arr");
        expect(result).toHaveProperty("length");
    });
});

describe("toCode39", () => {
    test("returns correct structure", () => {
        const result = toCode39("ABC123");
        expect(result).toHaveProperty("arr");
        expect(result).toHaveProperty("sizes");
        expect(result).toHaveProperty("length");
    });

    test("calculates correct length", () => {
        const result = toCode39("ABC");
        // Start (*) + 3 chars + End (*) = 5 elements, each 13 units
        expect(result.length).toBe(5 * 13);
    });

    test("handles numbers", () => {
        const result = toCode39("0123456789");
        expect(result.arr.length).toBe(12); // Start + 10 digits + End
    });

    test("handles uppercase letters", () => {
        const result = toCode39("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        expect(result.arr.length).toBe(28); // Start + 26 letters + End
    });

    test("handles special characters", () => {
        const result = toCode39("- $%./+");
        expect(result).toHaveProperty("arr");
    });

    test("throws for invalid characters", () => {
        expect(() => toCode39("abc")).toThrow("OOB"); // lowercase not allowed
        expect(() => toCode39("@")).toThrow("OOB");
    });

    test("start and end markers are the same", () => {
        const result = toCode39("TEST");
        expect(result.arr[0]).toBe(result.arr[result.arr.length - 1]);
    });
});
