@R0
D=M
@a
M=D

@R1
D=M
@b
M=D

@sum
M=0

// swap if a > b
@a
D=M
@b
D=D-M;
@INIT_LOOP
D;JLE

// temp = a
@a
D=M
@temp
M=D

// a = b
@b
D=M
@a
M=D

// b = temp
@temp
D=M
@b
M=D

// for(i = 0; i < a; i++)
// sum += b
(INIT_LOOP)
@i
M=0

(START_LOOP)
@i
D=M
@a
D=D-M
@END_LOOP
D;JEQ

@b
D=M
@sum
M=M+D

@i
M=M+1
@START_LOOP
0;JMP
(END_LOOP)

// R3 = sum
@sum
D=M
@R2
M=D

(END)
@END
0;JMP
