export type PersonGender = 'male' | 'female' | 'unspecified'

export interface Person {
  id: string
  name: string
  role: string
  gender?: PersonGender
  skills: string[]
  note: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>
