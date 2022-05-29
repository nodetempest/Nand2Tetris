// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[2], respectively.)
//
// This program only needs to handle arguments that satisfy
// R0 >= 0, R1 >= 0, and R0*R1 < 32768.

// a = RAM[0]
@R0
D=M
@a
M=D

// b = RAM[1]
@R1
D=M
@b
M=D

// sum = 0
@sum
M=0

// if a <= b go to LOOP
@a
D=M
@b
D=D-M
@LOOP
D;JLE

// else swap a and b
@a
D=M
@temp
M=D     // temp = a

@b
D=M     
@a
M=D     // a = b

@temp
D=M     
@b
M=D     // b = temp

(LOOP)
// if a == 0 go to END_LOOP
@a
D=M
@END_LOOP
D;JEQ

// else accum sum
@b
D=M
@sum
M=M+D   // sum += b

// iterate loop
@a
M=M-1   // a--

@LOOP
0;JMP
(END_LOOP)

@sum
D=M
@R2
M=D     // RAM[2] = sum

(END)
@END
0;JMP