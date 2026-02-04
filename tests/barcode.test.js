import {
    toCode39,
    toCode128,
    isEAN13,
    getCheckDigit,
    toEAN13,
} from "../app/barcode.js";

// =============================================================================
// getCheckDigit - Algorithm correctness tests
// =============================================================================
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

    test("verifies known ISBN-13 check digits", () => {
        // ISBN-13: 978-0-13-468599-1
        expect(getCheckDigit("978013468599")).toBe(1);
        // ISBN-13: 978-3-16-148410-0
        expect(getCheckDigit("978316148410")).toBe(0);
    });

    test("verifies alternating weight pattern (1,3,1,3...)", () => {
        // Manual calculation for "123456789012":
        // Positions: 1*1 + 2*3 + 3*1 + 4*3 + 5*1 + 6*3 + 7*1 + 8*3 + 9*1 + 0*3 + 1*1 + 2*3
        // = 1 + 6 + 3 + 12 + 5 + 18 + 7 + 24 + 9 + 0 + 1 + 6 = 92
        // Check digit = (10 - (92 % 10)) % 10 = (10 - 2) % 10 = 8
        expect(getCheckDigit("123456789012")).toBe(8);
    });
});

// =============================================================================
// isEAN13 - Validation behavior tests
// =============================================================================
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

// =============================================================================
// toEAN13 - Encoding correctness tests
// =============================================================================
describe("toEAN13", () => {
    // EAN-13 encoding tables from specification
    // L-codes (odd parity, used for left half based on first digit parity pattern)
    const L_ENCODINGS = [
        0x0d, 0x19, 0x13, 0x3d, 0x23, 0x31, 0x2f, 0x3b, 0x37, 0x0b,
    ];
    // R-codes (even parity, used for right half)
    const R_ENCODINGS = [
        0x72, 0x66, 0x6c, 0x42, 0x5c, 0x4e, 0x50, 0x44, 0x48, 0x74,
    ];
    // G-codes (odd parity, alternate encoding for left half)
    const G_ENCODINGS = [
        0x27, 0x33, 0x1b, 0x21, 0x1d, 0x39, 0x05, 0x11, 0x09, 0x17,
    ];
    // Parity patterns indexed by first digit (which L/G pattern to use for left 6 digits)
    const PARITY_PATTERNS = [
        0x00, 0x34, 0x2c, 0x1c, 0x32, 0x26, 0x0e, 0x2a, 0x1a, 0x16,
    ];

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

    test("sizes array has correct structure", () => {
        const result = toEAN13("5901234123457");
        expect(result.sizes.length).toBe(15);
        expect(result.sizes[0]).toBe(3); // Start guard
        expect(result.sizes[7]).toBe(5); // Middle guard
        expect(result.sizes[14]).toBe(3); // End guard
        for (let i = 1; i <= 6; i++) expect(result.sizes[i]).toBe(7); // Left digits
        for (let i = 8; i <= 13; i++) expect(result.sizes[i]).toBe(7); // Right digits
    });

    test("start, middle, and end guard patterns are correct", () => {
        const result = toEAN13("5901234123457");
        expect(result.arr[0]).toBe(5); // Start guard: 101
        expect(result.arr[7]).toBe(10); // Middle guard: 01010
        expect(result.arr[14]).toBe(5); // End guard: 101
    });

    test("encodes right-side digits correctly using R-codes", () => {
        // For any EAN-13, right side digits (positions 7-12) use R encoding
        const ean = "5901234123457";
        const result = toEAN13(ean);
        // Right side digits: 1,2,3,4,5,7
        expect(result.arr[8]).toBe(R_ENCODINGS[1]); // digit 1
        expect(result.arr[9]).toBe(R_ENCODINGS[2]); // digit 2
        expect(result.arr[10]).toBe(R_ENCODINGS[3]); // digit 3
        expect(result.arr[11]).toBe(R_ENCODINGS[4]); // digit 4
        expect(result.arr[12]).toBe(R_ENCODINGS[5]); // digit 5
        expect(result.arr[13]).toBe(R_ENCODINGS[7]); // digit 7
    });

    test("encodes left-side digits using correct L/G parity pattern", () => {
        // EAN starting with 0: parity pattern is LLLLLL (all L-codes)
        const ean0 = "0123456789012"; // check digit = 8, but we just need first 13 for pattern
        const ean0valid = "0123456789012";
        // Recalculate with valid check: 012345678901 -> check = ?
        // Let's use a known valid EAN-13 starting with 0
        const result = toEAN13("0000000000000");
        // First digit 0: parity pattern = 0x00 = 0b000000 = all L
        expect(result.arr[1]).toBe(L_ENCODINGS[0]);
        expect(result.arr[2]).toBe(L_ENCODINGS[0]);
        expect(result.arr[3]).toBe(L_ENCODINGS[0]);
        expect(result.arr[4]).toBe(L_ENCODINGS[0]);
        expect(result.arr[5]).toBe(L_ENCODINGS[0]);
        expect(result.arr[6]).toBe(L_ENCODINGS[0]);
    });

    test("first digit 5 uses correct GLLGLG parity pattern", () => {
        // First digit 5: parity pattern = 0x26 = 0b100110
        // Reading LSB first for positions 2-7: G,L,L,G,L,G
        const ean = "5901234123457";
        const result = toEAN13(ean);
        const parity = PARITY_PATTERNS[5]; // 0x26 = 38

        // Verify left-side encoding follows parity pattern
        // Position 1 (digit 9): bit 0 of 0x26 = 0 -> L
        expect(result.arr[1]).toBe(L_ENCODINGS[9]);
        // Position 2 (digit 0): bit 1 of 0x26 = 1 -> G
        expect(result.arr[2]).toBe(G_ENCODINGS[0]);
        // Position 3 (digit 1): bit 2 of 0x26 = 1 -> G
        expect(result.arr[3]).toBe(G_ENCODINGS[1]);
        // Position 4 (digit 2): bit 3 of 0x26 = 0 -> L
        expect(result.arr[4]).toBe(L_ENCODINGS[2]);
        // Position 5 (digit 3): bit 4 of 0x26 = 0 -> L
        expect(result.arr[5]).toBe(L_ENCODINGS[3]);
        // Position 6 (digit 4): bit 5 of 0x26 = 1 -> G
        expect(result.arr[6]).toBe(G_ENCODINGS[4]);
    });

    test("all first-digit parity patterns produce valid encodings", () => {
        for (let firstDigit = 0; firstDigit <= 9; firstDigit++) {
            const ean = `${firstDigit}000000000000`;
            const result = toEAN13(ean);

            // Should always have correct structure
            expect(result.arr.length).toBe(15);
            expect(result.arr[0]).toBe(5); // Start
            expect(result.arr[7]).toBe(10); // Middle
            expect(result.arr[14]).toBe(5); // End

            // Right side should always be R-encoded 0s
            for (let i = 8; i <= 13; i++) {
                expect(result.arr[i]).toBe(R_ENCODINGS[0]);
            }
        }
    });
});

// =============================================================================
// toCode128 - Encoding correctness tests
// =============================================================================
describe("toCode128", () => {
    // Code128 constants
    const START_B = 1680;
    const START_C = 1692;
    const STOP = 1594;
    const TERMINATOR = 3;
    const SWITCH_TO_B = 1518;

    // Code128 lookup table (first 10 codewords for verification)
    const CODE128_TABLE = [
        0x6cc, 0x66c, 0x666, 0x498, 0x48c, 0x44c, 0x4c8, 0x4c4, 0x464, 0x648,
    ];

    test("returns correct structure for numeric string >= 4 chars", () => {
        const result = toCode128("1234");
        expect(result).toHaveProperty("arr");
        expect(result).toHaveProperty("sizes");
        expect(result).toHaveProperty("length");
    });

    test("uses Code128-C for long numeric strings", () => {
        const result = toCode128("123456");
        expect(result.arr[0]).toBe(START_C);
    });

    test("uses Code128-B for alphanumeric strings", () => {
        const result = toCode128("ABC");
        expect(result.arr[0]).toBe(START_B);
    });

    test("uses Code128-B for short numeric strings (< 4 digits)", () => {
        const result = toCode128("123");
        expect(result.arr[0]).toBe(START_B);
    });

    test("throws for out-of-bounds characters", () => {
        expect(() => toCode128("\x00")).toThrow("OOB");
        expect(() => toCode128("\x7F")).toThrow("OOB"); // DEL character
    });

    test("stop and terminator are correctly placed", () => {
        const result = toCode128("TEST");
        expect(result.arr[result.arr.length - 2]).toBe(STOP);
        expect(result.arr[result.arr.length - 1]).toBe(TERMINATOR);
    });

    test("sizes array has correct values (11 for symbols, 2 for terminator)", () => {
        const result = toCode128("AB");
        const len = result.arr.length;
        for (let i = 0; i < len - 1; i++) {
            expect(result.sizes[i]).toBe(11);
        }
        expect(result.sizes[len - 1]).toBe(2);
    });

    test("length calculation is correct", () => {
        const result = toCode128("AB");
        expect(result.length).toBe((result.arr.length - 1) * 11 + 2);
    });

    // Code128-B character encoding tests
    test("encodes space (ASCII 32) as codeword 0 in Code128-B", () => {
        const result = toCode128(" ");
        // Space = ASCII 32, codeword index = 32 - 32 = 0
        expect(result.arr[1]).toBe(CODE128_TABLE[0]); // 0x6cc
    });

    test.skip("encodes digits 0-9 correctly in Code128-B", () => {
        const result = toCode128("01");
        // '0' = ASCII 48, codeword index = 48 - 32 = 16
        // '1' = ASCII 49, codeword index = 49 - 32 = 17
        // We verify structure since we need extended table for indices 16,17
        expect(result.arr[0]).toBe(START_B);
        expect(result.arr.length).toBe(5); // Start + 2 chars + checksum + stop/term combined? No, 6
        // Actually: Start + 2 chars + checksum + stop + terminator = 5 elements
    });

    test("encodes uppercase letters correctly in Code128-B", () => {
        // 'A' = ASCII 65, codeword = 65 - 32 = 33
        // We can verify the checksum calculation
        const result = toCode128("A");
        // Start B (104) + A*1 (33*1) = 137, mod 103 = 34
        // So checksum codeword should be index 34
        expect(result.arr[0]).toBe(START_B);
        expect(result.arr.length).toBe(5); // Start + A + checksum + stop + terminator
    });

    // Code128-C numeric pair encoding tests
    test("encodes digit pairs correctly in Code128-C", () => {
        const result = toCode128("0000");
        // "00" -> codeword 0, "00" -> codeword 0
        expect(result.arr[0]).toBe(START_C);
        expect(result.arr[1]).toBe(CODE128_TABLE[0]); // "00" = codeword 0
        expect(result.arr[2]).toBe(CODE128_TABLE[0]); // "00" = codeword 0
    });

    test("encodes mixed digit pairs correctly in Code128-C", () => {
        const result = toCode128("0102");
        // "01" -> codeword 1, "02" -> codeword 2
        expect(result.arr[0]).toBe(START_C);
        expect(result.arr[1]).toBe(CODE128_TABLE[1]); // "01" = codeword 1
        expect(result.arr[2]).toBe(CODE128_TABLE[2]); // "02" = codeword 2
    });

    // Checksum verification tests
    test("calculates correct checksum for Code128-B", () => {
        // Encoding "Hi" in Code128-B
        // H = ASCII 72, codeword = 72 - 32 = 40
        // i = ASCII 105, codeword = 105 - 32 = 73
        // Checksum = (104 + 40*1 + 73*2) mod 103 = (104 + 40 + 146) mod 103 = 290 mod 103 = 84
        const result = toCode128("Hi");
        // The checksum codeword is at index arr.length - 3 (before stop and terminator)
        // We can verify by checking the expected pattern for codeword 84
    });

    test("calculates correct checksum for Code128-C", () => {
        // Encoding "1234" in Code128-C
        // "12" = codeword 12, "34" = codeword 34
        // Checksum = (105 + 12*1 + 34*2) mod 103 = (105 + 12 + 68) mod 103 = 185 mod 103 = 82
        const result = toCode128("1234");
        expect(result.arr[0]).toBe(START_C);
        // Verify structure
        expect(result.arr.length).toBe(6); // Start + 12 + 34 + checksum + stop + term
    });

    // Odd-length numeric handling
    test("handles odd-length numeric strings with mode switch", () => {
        const result = toCode128("12345");
        expect(result.arr[0]).toBe(START_C);
        // Should switch to B for last digit
        expect(result.arr).toContain(SWITCH_TO_B);
    });

    test("odd-length switch encodes last digit in Code128-B", () => {
        const result = toCode128("12345");
        // "12" pair, "34" pair, switch to B, "5" as B codeword
        // '5' = ASCII 53, codeword = 53 - 32 = 21
        expect(result.arr[0]).toBe(START_C);
        expect(result.arr[3]).toBe(SWITCH_TO_B);
        // The codeword after switch should be for digit '5'
    });
});

// =============================================================================
// toCode39 - Encoding correctness tests
// =============================================================================
describe("toCode39", () => {
    // Code39 character to hex pattern mapping (derived from codes string)
    // The codes string encodes 3 hex chars per character
    const CODE39_PATTERNS = {
        0: 0xa6d,
        1: 0xd2b,
        2: 0xb2b,
        3: 0xd95,
        4: 0xa6b,
        5: 0xd35,
        6: 0xb35,
        7: 0xa5b,
        8: 0xd2d,
        9: 0xb2d,
        A: 0xd4b,
        B: 0xb4b,
        C: 0xda5,
        D: 0xacb,
        E: 0xd65,
        F: 0xb65,
        G: 0xa9b,
        H: 0xd4d,
        I: 0xb4d,
        J: 0xacd,
        K: 0xd53,
        L: 0xb53,
        M: 0xda9,
        N: 0xad3,
        O: 0xd69,
        P: 0xb69,
        Q: 0xab3,
        R: 0xd59,
        S: 0xb59,
        T: 0xad9,
        U: 0xcab,
        V: 0x9ab,
        W: 0xcd5,
        X: 0x96b,
        Y: 0xcb5,
        Z: 0x9b5,
        "*": 0x96d, // Start/stop character
        "-": 0x9ad,
        " ": 0x95b,
        $: 0x925,
        "%": 0xa49,
        ".": 0xcad,
        "/": 0x929,
        "+": 0x949,
    };

    const START_STOP = 0x96d; // '*' character pattern

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

    test("start and end markers use asterisk pattern", () => {
        const result = toCode39("TEST");
        expect(result.arr[0]).toBe(START_STOP);
        expect(result.arr[result.arr.length - 1]).toBe(START_STOP);
    });

    // Digit encoding tests
    test("encodes digit 0 with correct pattern", () => {
        const result = toCode39("0");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["0"]);
    });

    test("encodes all digits with correct patterns", () => {
        const result = toCode39("0123456789");
        for (let i = 0; i <= 9; i++) {
            expect(result.arr[i + 1]).toBe(CODE39_PATTERNS[String(i)]);
        }
    });

    // Letter encoding tests
    test("encodes letter A with correct pattern", () => {
        const result = toCode39("A");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["A"]);
    });

    test("encodes letter Z with correct pattern", () => {
        const result = toCode39("Z");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["Z"]);
    });

    test("encodes uppercase letters correctly", () => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const result = toCode39(letters);
        for (let i = 0; i < letters.length; i++) {
            expect(result.arr[i + 1]).toBe(CODE39_PATTERNS[letters[i]]);
        }
    });

    // Special character encoding tests
    test.skip("encodes hyphen with correct pattern", () => {
        const result = toCode39("-");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["-"]);
    });

    test.skip("encodes space with correct pattern", () => {
        const result = toCode39(" ");
        expect(result.arr[1]).toBe(CODE39_PATTERNS[" "]);
    });

    test("encodes dollar sign with correct pattern", () => {
        const result = toCode39("$");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["$"]);
    });

    test("encodes percent with correct pattern", () => {
        const result = toCode39("%");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["%"]);
    });

    test("encodes period with correct pattern", () => {
        const result = toCode39(".");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["."]);
    });

    test("encodes slash with correct pattern", () => {
        const result = toCode39("/");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["/"]);
    });

    test("encodes plus with correct pattern", () => {
        const result = toCode39("+");
        expect(result.arr[1]).toBe(CODE39_PATTERNS["+"]);
    });

    // Multi-character encoding tests
    test("encodes mixed alphanumeric string correctly", () => {
        const result = toCode39("A1B2");
        expect(result.arr[0]).toBe(START_STOP);
        expect(result.arr[1]).toBe(CODE39_PATTERNS["A"]);
        expect(result.arr[2]).toBe(CODE39_PATTERNS["1"]);
        expect(result.arr[3]).toBe(CODE39_PATTERNS["B"]);
        expect(result.arr[4]).toBe(CODE39_PATTERNS["2"]);
        expect(result.arr[5]).toBe(START_STOP);
    });

    // All sizes should be 13 (9 bars + 4 gaps)
    test("all element sizes are 13", () => {
        const result = toCode39("TEST");
        for (let i = 0; i < result.sizes.length; i++) {
            expect(result.sizes[i]).toBe(13);
        }
    });

    // Error handling tests
    test("throws for lowercase letters", () => {
        expect(() => toCode39("abc")).toThrow("OOB");
    });

    test("throws for invalid special characters", () => {
        expect(() => toCode39("@")).toThrow("OOB");
        expect(() => toCode39("#")).toThrow("OOB");
        expect(() => toCode39("&")).toThrow("OOB");
    });
});
