// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

// Put your code here.
(MAIN)
@i
M=0

@addr
M=0

// if no key is pressed then color is white
// else color is black
@color
M=0

@KBD
D=M
@DRAW_SCREEN
D;JEQ

@color
M=-1

(DRAW_SCREEN)
@SCREEN
D=A
@i
D=D+M
@addr
M=D     // addr = SCREEN + i

// if addr === KBD then end draw (KBD goes after screen memory)
@KBD
D=D-A
@END_DRAW
D;JEQ

// else start drawing
@color
D=M
@addr
A=M
M=D

// iterate
@i
M=M+1
@DRAW_SCREEN
0;JMP
(END_DRAW)

@MAIN
0;JMP