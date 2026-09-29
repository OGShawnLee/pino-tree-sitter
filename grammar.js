/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "pino",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.primary_expression, $.argument_list],
  ],

  rules: {
    source_file: ($) => repeat($._statement),

    _statement: ($) =>
      choice(
        $.variable_declaration,
        $.function_definition,
        $.struct_definition,
        $.interface_definition,
        $.enum_definition,
        $.union_definition,
        $.test_block,
        $.module_declaration,
        $.import_statement,
        $.for_statement,
        $.if_statement,
        $.return_statement,
        $.break_statement,
        $.continue_statement,
        $.assert_statement,
        $.expression_statement,
        $.block,
      ),

    comment: ($) => token(seq("#", /.*/)),

    // Module & Imports
    module_declaration: ($) => seq("module", field("name", $.identifier)),

    import_statement: ($) =>
      prec.right(
        choice(
          seq("import", field("module", $.identifier)),
          seq(
            "from",
            field("module", $.identifier),
            "import",
            repeat1(choice(field("item", $.identifier), ",")),
          ),
        ),
      ),

    // Variables & Constants: val x = 10, var count = 0
    variable_declaration: ($) =>
      seq(
        field("kind", choice("var", "val")),
        field("name", choice($.identifier, $.tuple_destructure)),
        optional(seq("=", field("value", $._expression))),
      ),

    tuple_destructure: ($) =>
      seq(
        "@",
        "(",
        repeat(
          choice(
            seq(field("label", $.identifier), ":", field("name", $.identifier)),
            field("name", $.identifier),
            ",",
          ),
        ),
        ")",
      ),

    // Test blocks: test "name" { ... }
    test_block: ($) =>
      seq("test", field("name", $.string_literal), field("body", $.block)),

    // Function definition: fn name(a int, b = 10) ReturnType { ... }
    function_definition: ($) =>
      seq(
        optional("pub"),
        optional("static"),
        "fn",
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(field("return_type", $.type)),
        field(
          "body",
          choice($.block, seq(choice("=>", "->"), field("body_expr", $._expression))),
        ),
      ),

    parameter_list: ($) => seq("(", repeat(choice($.parameter, ",")), ")"),

    // In Pino:
    // With type: `a int`
    // With default: `a = 10` (no type when default is given!)
    // Just name (e.g. lambdas or untyped): `a`
    parameter: ($) =>
      choice(
        seq(field("name", $.identifier), "=", field("default", $._expression)),
        seq(field("name", $.identifier), field("type", $.type)),
        field("name", $.identifier),
      ),

    // Lambda expressions:
    // fn(x int) => x * 2
    // fn(x, y) { return x + y }
    // fn(x int) bool => x > 0
    lambda_expression: ($) =>
      seq(
        "fn",
        field("parameters", $.parameter_list),
        optional(field("return_type", $.type)),
        field(
          "body",
          choice($.block, seq(choice("=>", "->"), field("body_expr", $._expression))),
        ),
      ),

    // Structs
    struct_definition: ($) =>
      seq(
        optional("pub"),
        "struct",
        field("name", $.type_identifier),
        "{",
        repeat(
          choice($.struct_field, $.struct_embed, $.function_definition, ","),
        ),
        "}",
      ),

    struct_embed: ($) => field("type", $.type_identifier),

    // Struct field: name Type [= default]
    struct_field: ($) =>
      seq(
        optional("pub"),
        field("name", $.identifier),
        field("type", $.type),
        optional(seq("=", field("default", $._expression))),
      ),

    // Struct instantiation: Player { name: "Shawn", hp: 100 }
    struct_instantiation: ($) =>
      prec(
        9,
        seq(
          field("type", $.type_identifier),
          "{",
          repeat(
            choice(
              seq(
                field("field", $.identifier),
                optional(seq(":", field("value", $._expression))),
              ),
              ",",
            ),
          ),
          "}",
        ),
      ),

    // Interfaces
    interface_definition: ($) =>
      seq(
        optional("pub"),
        "interface",
        field("name", $.type_identifier),
        "{",
        repeat($.interface_method),
        "}",
      ),

    interface_method: ($) =>
      prec.right(
        seq(
          "fn",
          field("name", $.identifier),
          field("parameters", $.parameter_list),
          optional(field("return_type", $.type)),
        ),
      ),

    // Enums: enum Color { Red Green Blue }
    enum_definition: ($) =>
      seq(
        optional("pub"),
        "enum",
        field("name", $.type_identifier),
        "{",
        repeat(choice($.enum_member, ",")),
        "}",
      ),

    enum_member: ($) =>
      seq(
        field("name", choice($.identifier, $.type_identifier)),
        optional(seq("=", field("value", $._expression))),
      ),

    // Tagged Unions: union Result { Success([]Token) Error(string) Pending }
    union_definition: ($) =>
      seq(
        optional("pub"),
        "union",
        field("name", $.type_identifier),
        "{",
        repeat(choice($.union_member, ",")),
        "}",
      ),

    union_member: ($) =>
      seq(
        field("name", $.type_identifier),
        optional(seq("(", repeat(choice($.type, ",")), ")")),
      ),

    // Types
    type: ($) =>
      choice(
        $.primitive_type,
        $.type_identifier,
        $.vector_type,
        $.map_type,
        $.tuple_type,
        $.function_type,
      ),

    primitive_type: ($) =>
      choice(
        "int",
        "float",
        "string",
        "bool",
        "rune",
        "regex",
        "any",
        "void",
        "never",
      ),

    vector_type: ($) => seq("[]", $.type),
    map_type: ($) => seq("map", "[", $.type, ",", $.type, "]"),
    tuple_type: ($) =>
      seq("@", "(", repeat(choice(seq($.identifier, $.type), ",")), ")"),

    // Function types:
    // fn
    // fn -> int
    // fn (int)
    // fn (int) -> int
    // fn (int, int) -> int
    function_type: ($) =>
      prec.right(
        seq(
          "fn",
          optional(
            seq(
              "(",
              repeat(choice($.type, ",")),
              ")"
            )
          ),
          optional(
            seq(
              "->",
              field("return_type", $.type)
            )
          )
        )
      ),

    // Control Flow
    if_statement: ($) =>
      seq(
        "if",
        field("condition", $._expression),
        field("consequence", $.block),
        optional(
          seq(
            "else",
            field("alternative", $.block)
          )
        )
      ),

    // if-then-else as an expression: val x = if a > 0 then 1 else 0
    if_expression: ($) =>
      prec.right(
        1,
        seq(
          "if",
          field("condition", $._expression),
          "then",
          field("consequence", $._expression),
          "else",
          field("alternative", $._expression),
        ),
      ),

    // Universal for loop: for { }, for 3 { }, for x in items { }, for idx, x in items { }
    for_statement: ($) =>
      seq(
        "for",
        optional(
          choice(
            field("count", $._expression),
            seq(
              field(
                "iterator",
                choice($.identifier, seq($.identifier, ",", $.identifier)),
              ),
              "in",
              field("iterable", $._expression),
            ),
          ),
        ),
        field("body", $.block),
      ),

    // Pattern Matching (used both as expression and as statement)
    match_expression: ($) =>
      seq(
        "match",
        field("value", $._expression),
        "{",
        repeat($.match_case),
        optional($.match_else),
        "}",
      ),

    match_case: ($) =>
      seq(
        "when",
        field("patterns", repeat1(choice($._expression, ","))),
        choice(
          field("body", $.block),
          seq(choice("=>", "->"), field("body_expr", $._expression)),
        ),
      ),

    match_else: ($) =>
      seq(
        "else",
        choice(
          field("body", $.block),
          seq(choice("=>", "->"), field("body_expr", $._expression)),
        ),
      ),

    yield_expression: ($) => seq("yield", $._expression),

    return_statement: ($) => prec.right(seq("return", optional($._expression))),
    break_statement: ($) => "break",
    continue_statement: ($) => "continue",
    assert_statement: ($) => seq("assert", $._expression),

    block: ($) => seq("{", repeat($._statement), "}"),

    expression_statement: ($) => $._expression,

    // Expressions
    _expression: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.primary_expression,
        $.assignment_expression,
        $.if_expression,
        $.match_expression,
        $.lambda_expression,
        $.yield_expression,
        $.try_expression,
      ),

    try_expression: ($) =>
      prec.left(9, seq(field("expression", $._expression), "?")),

    assignment_expression: ($) =>
      prec.right(
        1,
        seq(
          field(
            "left",
            choice($.identifier, $.member_expression, $.index_expression),
          ),
          field("operator", choice("=", "+=", "-=", "*=", "/=", "%=")),
          field("right", $._expression),
        ),
      ),

    binary_expression: ($) => {
      const table = [
        ["or", 1],
        ["and", 2],
        ["==", 3],
        ["!=", 3],
        ["===", 3],
        ["!==", 3],
        ["<", 4],
        ["<=", 4],
        [">", 4],
        [">=", 4],
        ["+", 5],
        ["-", 5],
        ["*", 6],
        ["/", 6],
        ["%", 6],
        ["is", 7],
      ];

      return choice(
        ...table.map(([operator, precedence]) => {
          return prec.left(
            precedence,
            seq(
              field("left", $._expression),
              // @ts-ignore
              field("operator", operator),
              field("right", $._expression),
            ),
          );
        }),
      );
    },

    unary_expression: ($) =>
      prec(
        8,
        seq(
          field("operator", choice("not", "-")),
          field("argument", $._expression),
        ),
      ),

    primary_expression: ($) =>
      choice(
        $.identifier,
        $.type_identifier,
        $.integer_literal,
        $.float_literal,
        $.string_literal,
        $.rune_literal,
        $.boolean_literal,
        $.tuple_literal,
        $.vector_literal,
        $.map_literal,
        $.struct_instantiation,
        $.call_expression,
        $.member_expression,
        $.index_expression,
        $.parenthesized_expression,
        $.decorator,
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    tuple_literal: ($) =>
      seq(
        "@",
        "(",
        repeat(
          choice(
            seq(
              field("label", $.identifier),
              ":",
              field("value", $._expression),
            ),
            field("value", $.identifier),
            ",",
          ),
        ),
        ")",
      ),

    call_expression: ($) =>
      prec(
        9,
        seq(
          field("function", choice($.identifier, $.member_expression)),
          field("arguments", $.argument_list),
        ),
      ),

    argument_list: ($) =>
      seq(
        "(",
        repeat(
          choice($._expression, seq($.identifier, ":", $._expression), ","),
        ),
        ")",
      ),

    member_expression: ($) =>
      prec(
        10,
        seq(
          field("object", $._expression),
          choice("::", ":"),
          field("property", choice($.identifier, $.type_identifier)),
        ),
      ),

    index_expression: ($) =>
      prec(
        10,
        seq(
          field("array", $._expression),
          "[",
          field("index", $._expression),
          "]",
        ),
      ),

    vector_literal: ($) =>
      seq(
        optional($.vector_type),
        "[",
        repeat(choice($._expression, ",")),
        "]",
      ),

    map_literal: ($) =>
      seq(
        $.map_type,
        "{",
        repeat(
          choice(seq($._expression, choice(":", "->"), $._expression), ","),
        ),
        "}",
      ),

    decorator: ($) => seq("@", $.identifier),

    // Literals
    identifier: ($) => /[a-z_][a-zA-Z0-9_]*/,
    type_identifier: ($) => /[A-Z][a-zA-Z0-9_]*/,

    integer_literal: ($) => /[0-9]+(_[0-9]+)*/,
    float_literal: ($) => /[0-9]+(_[0-9]+)*\.[0-9]+(_[0-9]+)*/,

    string_literal: ($) =>
      seq(
        '"',
        repeat(
          choice(
            token.immediate(/[^"\\$]+/),
            $.escape_sequence,
            $.string_interpolation,
          ),
        ),
        '"',
      ),

    escape_sequence: ($) => token.immediate(seq("\\", /./)),

    string_interpolation: ($) =>
      seq("$", choice($.identifier, seq("(", $._expression, ")"))),

    rune_literal: ($) => seq("'", choice(/[^'\\]/, seq("\\", /./)), "'"),

    boolean_literal: ($) => choice("true", "false"),
  },
});
