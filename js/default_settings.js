/**************************************************/
/* Variable                                       */
/**************************************************/

const C_FILE_COMMENT = 
`/**
                             *******************
*******************************    C  FILE    ********************************
**                           *******************                            **
**                                                                          **
**  Project     : {Project_name}                                            **
**  Filename    : {FileName}                                                **
**  Version     : -.- (PCB : )                                              ** 
**  Revised by  : {Reviser}                                                 **
**  Date        : {0000.00.00}                                              **
**                                                                          **
******************************************************************************/`;

const HEADER_FILE_COMMENT = 
`/**
                             *******************
*******************************  HEADER FILE  ********************************
**                           *******************                            **
**                                                                          **
**  Project     : {Project_name}                                            **
**  Filename    : {FileName}                                                **
**  Version     : -.- (PCB : )                                              ** 
**  Revised by  : {Reviser}                                                 **
**  Date        : {0000.00.00}                                              **
**                                                                          **
******************************************************************************/`;

const INCLUDES_COMMENT = 
`/*********************************************************************************************************************/
/*----------------------------------------------------Includes-------------------------------------------------------*/
/*********************************************************************************************************************/`;

const MACRO_COMMENT = 
`/*********************************************************************************************************************/
/*-----------------------------------------------------Macro---------------------------------------------------------*/
/*********************************************************************************************************************/`;

const GLOBAL_VAR_COMMENT = 
`/*********************************************************************************************************************/
/*-------------------------------------------------Global Variable---------------------------------------------------*/
/*********************************************************************************************************************/`;

const DATA_STRUCTURE_COMMENT = 
`/*********************************************************************************************************************/
/*-------------------------------------------------Data Structures---------------------------------------------------*/
/*********************************************************************************************************************/`;

const FUNCTION_PROTOTYPES_COMMENT = 
`/*********************************************************************************************************************/
/*-----------------------------------------------Function Prototypes-------------------------------------------------*/
/*********************************************************************************************************************/`;

const INTERRUPT_COMMENT = 
`/*********************************************************************************************************************/
/*----------------------------------------------------Interrupt------------------------------------------------------*/
/*********************************************************************************************************************/`;

const PRIVATE_FUNCTION_COMMENT =
`/*********************************************************************************************************************/
/*-------------------------------------------------Private Function--------------------------------------------------*/
/*********************************************************************************************************************/`;

const EXTERN_FUNCTION_COMMENT = 
`/*********************************************************************************************************************/
/*-------------------------------------------------Extern Function---------------------------------------------------*/
/*********************************************************************************************************************/`;

const DESCRIPTION_PROMPT = 
`Here is a collection of comment codes, function names, function parameters, and return types.
The purpose is to utilize this information to describe the function in a way that is easily understandable at a higher level of abstraction.
The comments are written sequentially according to the function execution order.
A higher level of abstraction users do not need the details of the features.
Please do not include function-related information(ex, function name) in the description.. Write in under 100 characters.
Associate the rest of the information around the function name.
Multi-line comments may contain asterisks (*). Take this into account when analyzing.`;

const DEFAULT_COMMENTS = {
    'C_FILE_COMMENT': C_FILE_COMMENT,
    'HEADER_FILE_COMMENT': HEADER_FILE_COMMENT,
    'INCLUDES_COMMENT': INCLUDES_COMMENT,
    'MACRO_COMMENT': MACRO_COMMENT,
    'INTERRUPT_COMMENT': INTERRUPT_COMMENT,
    'GLOBAL_VAR_COMMENT': GLOBAL_VAR_COMMENT,
    'DATA_STRUCTURE_COMMENT': DATA_STRUCTURE_COMMENT,
    'FUNCTION_PROTOTYPES_COMMENT': FUNCTION_PROTOTYPES_COMMENT,
    'PRIVATE_FUNCTION_COMMENT': PRIVATE_FUNCTION_COMMENT,
    'EXTERN_FUNCTION_COMMENT': EXTERN_FUNCTION_COMMENT
};

const DEFAULT_PROMPT = {
    'DESCRIPTION_PROMPT': DESCRIPTION_PROMPT
};

const DEFAULT_HEADER_FILE_COMMENT_TYPES = [
    'HEADER_FILE_COMMENT',
    'INCLUDES_COMMENT',
    'MACRO_COMMENT',
    'GLOBAL_VAR_COMMENT',
    'DATA_STRUCTURE_COMMENT',
    'FUNCTION_PROTOTYPES_COMMENT',
    'PRIVATE_FUNCTION_COMMENT',
    'EXTERN_FUNCTION_COMMENT'
];

const DEFAULT_C_FILE_COMMENT_TYPES = [
    'C_FILE_COMMENT',
    'INCLUDES_COMMENT',
    'MACRO_COMMENT',
    'INTERRUPT_COMMENT',
    'GLOBAL_VAR_COMMENT',
    'DATA_STRUCTURE_COMMENT',
    'FUNCTION_PROTOTYPES_COMMENT',
    'PRIVATE_FUNCTION_COMMENT',
    'EXTERN_FUNCTION_COMMENT'
];

const DEFAULT_SETTING_DATA = {
    'Project_name':'',
    'Reviser':'',
    'OpenAI_API_key':''
};

const KEYWORD_COMMENT = [
    'function',
    'name',
    'parameter',
    'description',
    'file',
    'component',
    'layer',
    'return'
];

/**************************************************/
/* module export                                  */
/**************************************************/

module.exports = { 
    C_FILE_COMMENT,
    HEADER_FILE_COMMENT,
    INCLUDES_COMMENT,
    MACRO_COMMENT,
    GLOBAL_VAR_COMMENT,
    DATA_STRUCTURE_COMMENT,
    FUNCTION_PROTOTYPES_COMMENT,
    INTERRUPT_COMMENT,
    PRIVATE_FUNCTION_COMMENT,
    EXTERN_FUNCTION_COMMENT,

    DEFAULT_PROMPT,
    
    DEFAULT_COMMENTS,
    DEFAULT_HEADER_FILE_COMMENT_TYPES,
    DEFAULT_C_FILE_COMMENT_TYPES,
    DEFAULT_SETTING_DATA,

    KEYWORD_COMMENT
};