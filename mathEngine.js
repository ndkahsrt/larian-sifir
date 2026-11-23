/**
 * Enjin Matematik Sifir (Multiplication Math Engine)
 * Menguruskan soalan sifir 2 hingga 12 dan penjanaan pilihan jawapan pintar.
 */

class MathEngine {
    constructor() {
        this.selectedTables = [2]; // Default Sifir 2
        this.currentQuestion = null;
        this.history = [];
    }

    setTables(tables) {
        if (Array.isArray(tables) && tables.length > 0) {
            this.selectedTables = tables;
        } else if (typeof tables === 'number') {
            this.selectedTables = [tables];
        }
    }

    /**
     * Menjana satu soalan sifir baru bersama jawapan betul dan pengganggu (distractor)
     */
    generateQuestion() {
        // Pilih sifir secara rawak daripada sifir yang dipilih
        const tableIndex = Math.floor(Math.random() * this.selectedTables.length);
        const a = this.selectedTables[tableIndex];
        
        // Pengganda rawak antara 1 hingga 12 (atau elakkan soalan yang baru sahaja ditanya)
        let b;
        let attempts = 0;
        do {
            b = Math.floor(Math.random() * 12) + 1;
            attempts++;
        } while (
            attempts < 5 && 
            this.currentQuestion && 
            this.currentQuestion.a === a && 
            this.currentQuestion.b === b
        );

        const correctAnswer = a * b;
        const wrongAnswer = this.generateSmartDistractor(a, b, correctAnswer);

        // Pilih secara rawak lorong mana yang betul: 0 = KIRI, 1 = KANAN
        const correctLane = Math.random() < 0.5 ? 0 : 1;

        const leftAnswer = correctLane === 0 ? correctAnswer : wrongAnswer;
        const rightAnswer = correctLane === 1 ? correctAnswer : wrongAnswer;

        this.currentQuestion = {
            a,
            b,
            questionText: `${a} × ${b}`,
            correctAnswer,
            wrongAnswer,
            correctLane, // 0 = Left, 1 = Right
            leftAnswer,
            rightAnswer,
            answered: false,
            timestamp: Date.now()
        };

        return this.currentQuestion;
    }

    /**
     * Menjana jawapan salah yang munasabah (misconception-based distractor)
     */
    generateSmartDistractor(a, b, correct) {
        const distractors = [];

        // 1. Sifir jiran (a * (b + 1) atau a * (b - 1))
        if (b > 1) distractors.push(a * (b - 1));
        if (b < 12) distractors.push(a * (b + 1));

        // 2. Sifir sebelum/selepas ((a + 1) * b atau (a - 1) * b)
        if (a > 2) distractors.push((a - 1) * b);
        distractors.push((a + 1) * b);

        // 3. Kesilapan tambah berbanding darab (a + b)
        if (a + b !== correct && a + b > 0) {
            distractors.push(a + b);
        }

        // 4. Perbezaan kecil (+2, -2, +4, -4, +10)
        distractors.push(correct + (Math.random() < 0.5 ? 2 : -2));
        distractors.push(correct + (Math.random() < 0.5 ? 4 : -4));
        if (correct > 10) distractors.push(correct - 10);
        distractors.push(correct + 10);

        // 5. Digit terbalik jika 2 digit (cth: 54 -> 45)
        if (correct >= 12 && correct < 100) {
            const str = correct.toString();
            const rev = parseInt(str.split('').reverse().join(''), 10);
            if (rev !== correct && rev > 0) {
                distractors.push(rev);
            }
        }

        // Tapis hanya nombor positif, bukan jawapan sebenar, dan elakkan nombor negatif
        const validDistractors = distractors.filter(num => num > 0 && num !== correct);

        if (validDistractors.length === 0) {
            return correct + 2;
        }

        // Pilih satu rawak
        const chosen = validDistractors[Math.floor(Math.random() * validDistractors.length)];
        return chosen;
    }
}

if (typeof window !== 'undefined') {
    window.MathEngine = MathEngine;
}
