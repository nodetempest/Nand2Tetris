@256
D=A
@SP
M=D
@1
D=-A
@LCL
M=D
@2
D=-A
@ARG
M=D
@3
D=-A
@THIS
M=D
@4
D=-A
@THAT
M=D
@SP
D=M
@0
D=D+A
@temp_ptr
M=D
@Sys.init$ret.901123db06579fe6506045800a214c4b
D=A
@temp_ptr
A=M
M=D
@SP
D=M
@1
D=D+A
@temp_ptr
M=D
@LCL
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@2
D=D+A
@temp_ptr
M=D
@ARG
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@3
D=D+A
@temp_ptr
M=D
@THIS
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@4
D=D+A
@temp_ptr
M=D
@THAT 
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@0
D=D-A
@ARG
M=D
@5
D=A
@SP
M=M+D
@Sys.init
0;JMP
(Sys.init$ret.901123db06579fe6506045800a214c4b)
(Main.fibonacci)
@SP
D=M
@LCL
M=D
@0
D=A
@SP
M=M+D
@0
D=A
@ARG
A=M+D
D=M
@SP
A=M
M=D
@SP
M=M+1
@2
D=A
@SP
A=M
M=D
@SP
M=M+1
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
D=M-D
@IF_TRUE.93be0abe4ae4122f8ea9b366a4946368
D;JLT
@SP
A=M
M=0
@IF_FALSE.93be0abe4ae4122f8ea9b366a4946368
0;JMP
(IF_TRUE.93be0abe4ae4122f8ea9b366a4946368)
@SP
A=M
M=-1
(IF_FALSE.93be0abe4ae4122f8ea9b366a4946368)
@SP
M=M+1
@SP
M=M-1
A=M
D=M
@IF-GOTO_FALSE.27a738feab108aa704e6ff6b196c9e4c
D;JEQ
@IF_TRUE
0;JMP
(IF-GOTO_FALSE.27a738feab108aa704e6ff6b196c9e4c)
@IF_FALSE
0;JMP
(IF_TRUE)
@0
D=A
@ARG
A=M+D
D=M
@SP
A=M
M=D
@SP
M=M+1
@LCL
D=M
@endFrame
M=D
@endFrame
D=M
@5
A=D-A
D=M
@retAddr
M=D
@SP
A=M-1
D=M
@ARG
A=M
M=D
@ARG
D=M+1
@SP
M=D
@endFrame
D=M
@1
A=D-A
D=M
@THAT
M=D
@endFrame
D=M
@2
A=D-A
D=M
@THIS
M=D
@endFrame
D=M
@3
A=D-A
D=M
@ARG
M=D
@endFrame
D=M
@4
A=D-A
D=M
@LCL
M=D
@retAddr
A=M
0;JMP
(IF_FALSE)
@0
D=A
@ARG
A=M+D
D=M
@SP
A=M
M=D
@SP
M=M+1
@2
D=A
@SP
A=M
M=D
@SP
M=M+1
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
M=M-D
@SP
M=M+1
@SP
D=M
@0
D=D+A
@temp_ptr
M=D
@Main.fibonacci$ret.821c0f5dc37b4bb8b04007e1afb1ed06
D=A
@temp_ptr
A=M
M=D
@SP
D=M
@1
D=D+A
@temp_ptr
M=D
@LCL
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@2
D=D+A
@temp_ptr
M=D
@ARG
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@3
D=D+A
@temp_ptr
M=D
@THIS
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@4
D=D+A
@temp_ptr
M=D
@THAT 
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@1
D=D-A
@ARG
M=D
@5
D=A
@SP
M=M+D
@Main.fibonacci
0;JMP
(Main.fibonacci$ret.821c0f5dc37b4bb8b04007e1afb1ed06)
@0
D=A
@ARG
A=M+D
D=M
@SP
A=M
M=D
@SP
M=M+1
@1
D=A
@SP
A=M
M=D
@SP
M=M+1
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
M=M-D
@SP
M=M+1
@SP
D=M
@0
D=D+A
@temp_ptr
M=D
@Main.fibonacci$ret.5f889247150a1e5aac7bcd498e147b14
D=A
@temp_ptr
A=M
M=D
@SP
D=M
@1
D=D+A
@temp_ptr
M=D
@LCL
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@2
D=D+A
@temp_ptr
M=D
@ARG
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@3
D=D+A
@temp_ptr
M=D
@THIS
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@4
D=D+A
@temp_ptr
M=D
@THAT 
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@1
D=D-A
@ARG
M=D
@5
D=A
@SP
M=M+D
@Main.fibonacci
0;JMP
(Main.fibonacci$ret.5f889247150a1e5aac7bcd498e147b14)
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
M=M+D
@SP
M=M+1
@LCL
D=M
@endFrame
M=D
@endFrame
D=M
@5
A=D-A
D=M
@retAddr
M=D
@SP
A=M-1
D=M
@ARG
A=M
M=D
@ARG
D=M+1
@SP
M=D
@endFrame
D=M
@1
A=D-A
D=M
@THAT
M=D
@endFrame
D=M
@2
A=D-A
D=M
@THIS
M=D
@endFrame
D=M
@3
A=D-A
D=M
@ARG
M=D
@endFrame
D=M
@4
A=D-A
D=M
@LCL
M=D
@retAddr
A=M
0;JMP
(Sys.init)
@SP
D=M
@LCL
M=D
@0
D=A
@SP
M=M+D
@4
D=A
@SP
A=M
M=D
@SP
M=M+1
@SP
D=M
@0
D=D+A
@temp_ptr
M=D
@Main.fibonacci$ret.cbc34449f09ecbbf6d86ba8036e289ff
D=A
@temp_ptr
A=M
M=D
@SP
D=M
@1
D=D+A
@temp_ptr
M=D
@LCL
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@2
D=D+A
@temp_ptr
M=D
@ARG
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@3
D=D+A
@temp_ptr
M=D
@THIS
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@4
D=D+A
@temp_ptr
M=D
@THAT 
D=M
@temp_ptr
A=M
M=D
@SP
D=M
@1
D=D-A
@ARG
M=D
@5
D=A
@SP
M=M+D
@Main.fibonacci
0;JMP
(Main.fibonacci$ret.cbc34449f09ecbbf6d86ba8036e289ff)
(WHILE)
@WHILE
0;JMP