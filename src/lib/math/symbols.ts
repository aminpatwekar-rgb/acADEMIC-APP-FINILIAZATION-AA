export interface MathSymbol {
  label: string;
  latex: string;
  category: 'calculus' | 'algebra' | 'greek' | 'logic' | 'matrices';
  description?: string;
}

export const MATH_SYMBOLS: MathSymbol[] = [
  // Calculus
  { label: '∫ dx', latex: '\\int_{a}^{b} f(x) \\, dx', category: 'calculus', description: 'Definite integral' },
  { label: '∬', latex: '\\iint_{D} f(x, y) \\, dA', category: 'calculus', description: 'Double integral' },
  { label: 'd/dx', latex: '\\frac{d}{dx}', category: 'calculus', description: 'Derivative' },
  { label: '∂/∂x', latex: '\\frac{\\partial f}{\\partial x}', category: 'calculus', description: 'Partial derivative' },
  { label: '∑', latex: '\\sum_{i=1}^{n} x_i', category: 'calculus', description: 'Summation' },
  { label: '∏', latex: '\\prod_{i=1}^{n} x_i', category: 'calculus', description: 'Product' },
  { label: 'lim', latex: '\\lim_{x \\to \\infty}', category: 'calculus', description: 'Limit' },
  { label: '∞', latex: '\\infty', category: 'calculus', description: 'Infinity' },
  { label: '∇', latex: '\\nabla', category: 'calculus', description: 'Del / Gradient' },

  // Algebra & Operators
  { label: '√x', latex: '\\sqrt{x}', category: 'algebra', description: 'Square root' },
  { label: 'ⁿ√x', latex: '\\sqrt[n]{x}', category: 'algebra', description: 'n-th root' },
  { label: 'a/b', latex: '\\frac{a}{b}', category: 'algebra', description: 'Fraction' },
  { label: 'x²', latex: 'x^{2}', category: 'algebra', description: 'Superscript / Exponent' },
  { label: 'xᵢ', latex: 'x_{i}', category: 'algebra', description: 'Subscript' },
  { label: '±', latex: '\\pm', category: 'algebra', description: 'Plus-minus' },
  { label: '×', latex: '\\times', category: 'algebra', description: 'Cross product / Multiply' },
  { label: '÷', latex: '\\div', category: 'algebra', description: 'Division' },
  { label: '·', latex: '\\cdot', category: 'algebra', description: 'Dot product' },
  { label: '≈', latex: '\\approx', category: 'algebra', description: 'Approximately equal' },
  { label: '≠', latex: '\\neq', category: 'algebra', description: 'Not equal' },
  { label: '≤', latex: '\\leq', category: 'algebra', description: 'Less than or equal' },
  { label: '≥', latex: '\\geq', category: 'algebra', description: 'Greater than or equal' },

  // Greek Letters
  { label: 'α', latex: '\\alpha', category: 'greek' },
  { label: 'β', latex: '\\beta', category: 'greek' },
  { label: 'γ', latex: '\\gamma', category: 'greek' },
  { label: 'δ', latex: '\\delta', category: 'greek' },
  { label: 'ε', latex: '\\varepsilon', category: 'greek' },
  { label: 'θ', latex: '\\theta', category: 'greek' },
  { label: 'λ', latex: '\\lambda', category: 'greek' },
  { label: 'μ', latex: '\\mu', category: 'greek' },
  { label: 'π', latex: '\\pi', category: 'greek' },
  { label: 'σ', latex: '\\sigma', category: 'greek' },
  { label: 'τ', latex: '\\tau', category: 'greek' },
  { label: 'φ', latex: '\\phi', category: 'greek' },
  { label: 'ω', latex: '\\omega', category: 'greek' },
  { label: 'Δ', latex: '\\Delta', category: 'greek' },
  { label: 'Ω', latex: '\\Omega', category: 'greek' },

  // Logic & Sets
  { label: '∀', latex: '\\forall', category: 'logic', description: 'For all' },
  { label: '∃', latex: '\\exists', category: 'logic', description: 'There exists' },
  { label: '∈', latex: '\\in', category: 'logic', description: 'Element of' },
  { label: '∉', latex: '\\notin', category: 'logic', description: 'Not element of' },
  { label: '⊂', latex: '\\subset', category: 'logic', description: 'Subset of' },
  { label: '∪', latex: '\\cup', category: 'logic', description: 'Union' },
  { label: '∩', latex: '\\cap', category: 'logic', description: 'Intersection' },
  { label: '∅', latex: '\\emptyset', category: 'logic', description: 'Empty set' },
  { label: '⇒', latex: '\\implies', category: 'logic', description: 'Implies' },
  { label: '⇔', latex: '\\iff', category: 'logic', description: 'If and only if' },
  { label: 'ℝ', latex: '\\mathbb{R}', category: 'logic', description: 'Real numbers' },

  // Matrices & Grouping
  { label: '( … )', latex: '\\left( x \\right)', category: 'matrices', description: 'Parentheses' },
  { label: '[ … ]', latex: '\\left[ x \\right]', category: 'matrices', description: 'Brackets' },
  { label: '{ … }', latex: '\\left\\{ x \\right\\}', category: 'matrices', description: 'Braces' },
  { label: '| … |', latex: '\\left| x \\right|', category: 'matrices', description: 'Absolute value' },
  {
    label: '2x2 Matrix',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    category: 'matrices',
    description: '2x2 Matrix'
  },
];
