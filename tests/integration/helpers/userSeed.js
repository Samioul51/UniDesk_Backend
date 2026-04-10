export const studentEmail = "islam2107051@stud.kuet.ac.bd";
export const otherStudentEmail = "nudar2107041@stud.kuet.ac.bd";
export const facultyEmail = "teacher@cse.kuet.ac.bd";
export const adminEmail = "admin@cse.kuet.ac.bd";

export const buildStudent = (overrides = {}) => ({
  name: "A. K. M Samioul Islam",
  email: studentEmail,
  role: "student",
  department: "cse",
  studentID: "2107051",
  batch: "2K21",
  photoURL: "https://example.com/photo.jpg",
  photoId: "photo-1",
  status: "verified",
  ...overrides,
});

export const buildOtherStudent = (overrides = {}) => ({
  name: "Md. Zunaied Nudar",
  email: otherStudentEmail,
  role: "student",
  department: "cse",
  studentID: "2107041",
  batch: "2K21",
  photoURL: "https://example.com/photo2.jpg",
  photoId: "photo-2",
  status: "verified",
  ...overrides,
});

export const buildFaculty = (overrides = {}) => ({
  name: "Teacher",
  email: facultyEmail,
  role: "faculty",
  department: "cse",
  designation: "Professor",
  room: "201",
  photoURL: "https://example.com/teacher.jpg",
  status: "verified",
  ...overrides,
});

export const buildAdmin = (overrides = {}) => ({
  name: "admin",
  email: adminEmail,
  role: "admin",
  department: "cse",
  designation: "Professor",
  room: "201",
  photoURL: "https://example.com/admin.jpg",
  status: "verified",
  ...overrides,
});
