import * as dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
})

const PCM_CHAPTERS = {
  Physics: [
    // Class 11
    'Units and Measurement',
    'Scalars and Vectors',
    'Motion in a Plane',
    'Laws of Motion',
    'Gravitation',
    'Mechanical Properties of Solids',
    'Thermal Properties of Matter',
    'Sound',
    'Optics (Ray)',
    'Electrostatics',
    'Electric Current Through Conductors',
    'Magnetism',
    'Electromagnetic Waves and Communication Systems',
    // Class 12
    'Rotational Dynamics',
    'Mechanical Properties of Fluids',
    'Kinetic Theory of Gases',
    'Thermodynamics',
    'Oscillations',
    'Superposition of Waves',
    'Wave Optics',
    'Electrostatics (12th)',
    'Current Electricity',
    'Magnetic Fields Due to Electric Current',
    'Magnetic Materials',
    'Electromagnetic Induction',
    'AC Circuits',
    'Dual Nature of Radiation and Matter',
    'Structure of Atoms and Nuclei',
    'Semiconductor Devices',
  ],
  Chemistry: [
    // Class 11
    'Some Basic Concepts of Chemistry',
    'Structure of Atom',
    'Chemical Bonding and Molecular Structure',
    'Redox Reactions',
    'Modern Periodic Table',
    'Elements of Group 1 and 2',
    'Elements of Group 13, 14 and 15',
    'Hydrogen',
    'Surface Chemistry',
    'Basic Principles of Organic Chemistry',
    'Alkanes',
    'Alkenes',
    'Alkynes',
    'Aromatic Compounds',
    'Environmental Chemistry',
    // Class 12
    'Solid State',
    'Solutions and Colligative Properties',
    'Ionic Equilibria',
    'Chemical Thermodynamics and Energetics',
    'Electrochemistry',
    'Chemical Kinetics',
    'Elements of Group 16, 17 and 18',
    'Transition and Inner Transition Elements',
    'Coordination Compounds',
    'Halogen Derivatives of Alkanes',
    'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Carboxylic Acids',
    'Amines',
    'Biomolecules',
    'Introduction to Polymer Chemistry',
    'Green Chemistry and Nanochemistry',
  ],
  Maths: [
    // Class 11
    'Angle and Its Measurement',
    'Trigonometry - I',
    'Trigonometry - II',
    'Determinants and Matrices',
    'Straight Line',
    'Circle',
    'Conic Sections',
    'Measures of Dispersion',
    'Probability (11th)',
    'Complex Numbers',
    'Sequences and Series',
    'Permutations and Combinations',
    'Mathematical Induction',
    'Binomial Theorem',
    'Sets, Relations and Functions',
    'Limits',
    'Differentiation (11th)',
    'Integration (11th)',
    // Class 12
    'Mathematical Logic',
    'Matrices (12th)',
    'Trigonometric Functions',
    'Pair of Straight Lines',
    'Vectors',
    'Line and Plane',
    'Linear Programming',
    'Differentiation',
    'Applications of Derivative',
    'Integration',
    'Applications of Definite Integral',
    'Differential Equations',
    'Probability Distribution',
    'Binomial Distribution',
  ],
}

async function main() {
  console.log('Seeding subjects and chapters...')

  for (const [subjectName, chapters] of Object.entries(PCM_CHAPTERS)) {
    const subject = await prisma.subject.upsert({
      where: { name: subjectName },
      update: {},
      create: { name: subjectName },
    })

    for (let i = 0; i < chapters.length; i++) {
      await prisma.chapter.upsert({
        where: { subjectId_orderIndex: { subjectId: subject.id, orderIndex: i + 1 } },
        update: { name: chapters[i] },
        create: {
          subjectId: subject.id,
          name: chapters[i],
          orderIndex: i + 1,
        },
      })
    }

    console.log(`  ✓ ${subjectName}: ${chapters.length} chapters`)
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
