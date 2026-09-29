export interface ScienceFormula {
  name: string;
  field: 'Physics' | 'Chemistry' | 'Biology' | 'Computer Science';
  latex: string;
  description: string;
}

export const SCIENCE_FORMULAS: ScienceFormula[] = [
  // Physics
  {
    name: "Mass-Energy Equivalence",
    field: "Physics",
    latex: "E = m c^2",
    description: "Relationship between mass and relativistic energy"
  },
  {
    name: "Newton's Universal Gravitation",
    field: "Physics",
    latex: "F = G \\frac{m_1 m_2}{r^2}",
    description: "Gravitational force between two point masses"
  },
  {
    name: "Schrödinger Wave Equation",
    field: "Physics",
    latex: "i \\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)",
    description: "Time-dependent quantum state evolution"
  },
  {
    name: "Maxwell's Gauss Law",
    field: "Physics",
    latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}",
    description: "Electric field flux through closed Gaussian surface"
  },
  {
    name: "Kinematic Displacement",
    field: "Physics",
    latex: "s = u t + \\frac{1}{2} a t^2",
    description: "Uniform accelerated linear motion"
  },
  {
    name: "De Broglie Hypothesis",
    field: "Physics",
    latex: "\\lambda = \\frac{h}{p} = \\frac{h}{m v}",
    description: "Matter-wave wavelength"
  },

  // Chemistry
  {
    name: "Ideal Gas Law",
    field: "Chemistry",
    latex: "P V = n R T",
    description: "Equation of state for hypothetical ideal gas"
  },
  {
    name: "Arrhenius Equation",
    field: "Chemistry",
    latex: "k = A e^{-\\frac{E_a}{R T}}",
    description: "Temperature dependence of reaction rates"
  },
  {
    name: "Gibbs Free Energy",
    field: "Chemistry",
    latex: "\\Delta G = \\Delta H - T \\Delta S",
    description: "Thermodynamic potential for chemical spontaneity"
  },
  {
    name: "Henderson-Hasselbalch",
    field: "Chemistry",
    latex: "\\text{pH} = \\text{pK}_a + \\log \\left( \\frac{[\\text{A}^-]}{[\\text{HA}]} \\right)",
    description: "Buffer solution acid-base equilibrium"
  },
  {
    name: "Water Dissociation",
    field: "Chemistry",
    latex: "\\text{H}_2\\text{O} \\rightleftharpoons \\text{H}^+ + \\text{OH}^-",
    description: "Autoionization equilibrium of liquid water"
  },

  // Computer Science & Math
  {
    name: "Shannon Entropy",
    field: "Computer Science",
    latex: "H(X) = - \\sum_{i=1}^{n} P(x_i) \\log_2 P(x_i)",
    description: "Average rate of information produced by stochastic source"
  },
  {
    name: "Euler's Identity",
    field: "Computer Science",
    latex: "e^{i \\pi} + 1 = 0",
    description: "Unification of geometry, algebra, and analysis"
  }
];
