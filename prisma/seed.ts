import { PrismaClient, Prisma, RoomBuilding, RoomFloor, RoomType, RoomStatus, SemesterType, SemesterStatus, CourseType, CourseStatus, DepartmentType, SubjectType, SubjectStatus, ScheduleType, ScheduleStatus, AttendanceType, AttendanceVerification, Role, StudentType, InstructorType, GuardianType, UserGender, yearLevel, EnrollmentStatus, SectionStatus, TagType, RFIDStatus, ReaderStatus, ScanType, ScanStatus, RFIDEventType, LogSeverity, EventType, EventStatus, Priority, ReportType, ReportStatus, NotificationType, RecipientType, NotificationMethod, NotificationStatus, UserStatus, Status, AttendanceStatus, EmailStatus, EmailFolder, EmailRecipientType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Helper function to generate realistic college data
function generateRealisticCollegeData() {
  // Philippine addresses in Cainta, Rizal and nearby Metro Manila areas
  const philippineAddresses = [
    // Cainta, Rizal addresses
    'Blk 1, Lot 15, Phase 1, Valley Golf Subdivision, Cainta, Rizal',
    '123 Rizal Avenue, Barangay San Juan, Cainta, Rizal',
    '45 Ortigas Avenue Extension, Barangay Sto. Domingo, Cainta, Rizal',
    '78 A. Bonifacio Avenue, Barangay San Andres, Cainta, Rizal',
    'Unit 15B, Green Valley Condominium, Ortigas Avenue, Cainta, Rizal',
    'Blk 3, Lot 8, Green Meadows Subdivision, Cainta, Rizal',
    '156 Sumulong Highway, Barangay San Roque, Cainta, Rizal',
    '89 Felix Avenue, Barangay San Isidro, Cainta, Rizal',
    'Unit 7C, Eastwood Residences, Ortigas Avenue, Cainta, Rizal',
    'Blk 5, Lot 12, Valley View Subdivision, Cainta, Rizal',
    
    // Pasig City addresses
    '234 Meralco Avenue, Ortigas Center, Pasig City',
    '67 Shaw Boulevard, Barangay Kapitolyo, Pasig City',
    'Unit 12A, The Residences at Greenbelt, Ortigas Avenue, Pasig City',
    'Blk 2, Lot 10, Valle Verde 1, Pasig City',
    '456 C. Raymundo Avenue, Barangay San Miguel, Pasig City',
    
    // Marikina City addresses
    '789 Marikina-Infanta Highway, Barangay Concepcion Uno, Marikina City',
    '123 Gil Fernando Avenue, Barangay Sto. Niño, Marikina City',
    'Unit 8B, Riverbanks Center, Marikina City',
    'Blk 4, Lot 6, Provident Village, Marikina City',
    '567 Sumulong Highway, Barangay San Roque, Marikina City',
    
    // Quezon City addresses
    '890 Katipunan Avenue, Barangay Loyola Heights, Quezon City',
    '234 Commonwealth Avenue, Barangay Batasan Hills, Quezon City',
    'Unit 15C, UP Town Center, Katipunan Avenue, Quezon City',
    'Blk 6, Lot 9, Teachers Village, Quezon City',
    '456 Aurora Boulevard, Barangay Cubao, Quezon City',
    
    // Mandaluyong City addresses
    '567 EDSA, Barangay Wack-Wack, Mandaluyong City',
    '123 Boni Avenue, Barangay Plainview, Mandaluyong City',
    'Unit 9A, The Residences at Greenbelt, EDSA, Mandaluyong City',
    'Blk 7, Lot 11, Greenfield District, Mandaluyong City',
    '890 Shaw Boulevard, Barangay Highway Hills, Mandaluyong City',
    
    // San Juan City addresses
    '123 P. Guevarra Street, Barangay Balong-Bato, San Juan City',
    '456 N. Domingo Street, Barangay Greenhills, San Juan City',
    'Unit 10B, Greenhills Shopping Center, San Juan City',
    'Blk 8, Lot 14, Greenhills West, San Juan City',
    '789 Wilson Street, Barangay Corazon de Jesus, San Juan City',
    
    // Makati City addresses
    '234 Ayala Avenue, Barangay San Lorenzo, Makati City',
    '567 Paseo de Roxas, Barangay Bel-Air, Makati City',
    'Unit 11C, The Residences at Greenbelt, Makati City',
    'Blk 9, Lot 13, Forbes Park, Makati City',
    '890 McKinley Road, Barangay Forbes Park, Makati City',
    
    // Taguig City addresses
    '123 McKinley Parkway, Bonifacio Global City, Taguig City',
    '456 32nd Street, Bonifacio Global City, Taguig City',
    'Unit 12D, The Residences at Greenbelt, BGC, Taguig City',
    'Blk 10, Lot 16, McKinley West, Taguig City',
    '789 5th Avenue, Bonifacio Global City, Taguig City',
    
    // Antipolo City addresses
    '234 Sumulong Highway, Barangay San Roque, Antipolo City',
    '567 Marcos Highway, Barangay Mayamot, Antipolo City',
    'Unit 13A, Robinsons Place Antipolo, Antipolo City',
    'Blk 11, Lot 17, Valley Golf Subdivision, Antipolo City',
    '890 Ortigas Avenue Extension, Barangay Dela Paz, Antipolo City'
  ];

  // Philippine phone number prefixes
  const phonePrefixes = ['0915', '0916', '0917', '0918', '0919', '0920', '0921', '0922', '0923', '0924', '0925', '0926', '0927', '0928', '0929', '0930', '0931', '0932', '0933', '0934', '0935', '0936', '0937', '0938', '0939', '0940', '0941', '0942', '0943', '0944', '0945', '0946', '0947', '0948', '0949', '0950', '0951', '0952', '0953', '0954', '0955', '0956', '0957', '0958', '0959', '0960', '0961', '0962', '0963', '0964', '0965', '0966', '0967', '0968', '0969', '0970', '0971', '0972', '0973', '0974', '0975', '0976', '0977', '0978', '0979', '0980', '0981', '0982', '0983', '0984', '0985', '0986', '0987', '0988', '0989', '0990', '0991', '0992', '0993', '0994', '0995', '0996', '0997', '0998', '0999'];

  // Philippine surnames
  const philippineSurnames = [
    'Santos', 'Dela Cruz', 'Reyes', 'Mendoza', 'Garcia', 'Torres', 'Rodriguez', 'Lopez', 'Fernandez', 'Silva',
    'Morales', 'Ramos', 'Cruz', 'Martinez', 'Gomez', 'Ruiz', 'Diaz', 'Vega', 'Herrera', 'Luna',
    'Castro', 'Ortega', 'Navarro', 'Jimenez', 'Moreno', 'Valdez', 'Soto', 'Campos', 'Rivera', 'Flores',
    'Ortiz', 'Vargas', 'Romero', 'Medina', 'Aguilar', 'Guerrero', 'Pena', 'Rojas', 'Acosta', 'Figueroa',
    'Alvarado', 'Sandoval', 'Carrillo', 'Salazar', 'Galvan', 'Espinoza', 'Maldonado', 'Valencia', 'Mejia', 'Guzman',
    'Velazquez', 'Padilla', 'Contreras', 'Rivas', 'Miranda', 'Estrada', 'Bautista', 'Villanueva', 'Molina', 'Perez',
    'Gutierrez', 'Castillo', 'Ramirez', 'Reyes', 'Flores', 'Gonzalez', 'Torres', 'Diaz', 'Cruz', 'Morales',
    'Vasquez', 'Jimenez', 'Ramos', 'Ruiz', 'Herrera', 'Medina', 'Aguilar', 'Vargas', 'Castro', 'Mendoza',
    'Salazar', 'Guzman', 'Vega', 'Velazquez', 'Rojas', 'Diaz', 'Reyes', 'Morales', 'Cruz', 'Ortiz'
  ];

  // Philippine first names - expanded for uniqueness
  const philippineFirstNames = [
    // Male names
    'Jose', 'Juan', 'Antonio', 'Francisco', 'Manuel', 'Pedro', 'Carlos', 'Miguel', 'Luis', 'Ramon',
    'Fernando', 'Roberto', 'Eduardo', 'Alberto', 'Ricardo', 'Guillermo', 'Javier', 'Alejandro', 'Daniel', 'Andres',
    'Gabriel', 'Rafael', 'Santiago', 'Mateo', 'Sebastian', 'Diego', 'Adrian', 'Nicolas', 'Christian', 'David',
    'Jose Maria', 'Juan Carlos', 'Antonio Jose', 'Francisco Javier', 'Manuel Antonio', 'Pedro Jose', 'Carlos Miguel', 'Miguel Angel', 'Luis Fernando', 'Ramon Antonio',
    'Emilio', 'Felipe', 'Ignacio', 'Leonardo', 'Marcelo', 'Octavio', 'Pablo', 'Quentin', 'Rodrigo', 'Sergio',
    'Tomas', 'Ulises', 'Victor', 'Wilfredo', 'Xavier', 'Yuri', 'Zacarias', 'Abel', 'Benjamin', 'Cesar',
    'Dario', 'Efren', 'Felix', 'Gregorio', 'Hector', 'Ismael', 'Joaquin', 'Kevin', 'Lorenzo', 'Marcos',
    'Nestor', 'Oscar', 'Pascual', 'Quirino', 'Rolando', 'Samuel', 'Teodoro', 'Ulysses', 'Valentin', 'Wenceslao',
    
    // Female names
    'Maria', 'Ana', 'Carmen', 'Isabel', 'Rosa', 'Teresa', 'Elena', 'Patricia', 'Monica', 'Adriana',
    'Beatriz', 'Claudia', 'Diana', 'Eva', 'Gabriela', 'Helena', 'Iris', 'Julia', 'Laura', 'Natalia',
    'Olivia', 'Paula', 'Raquel', 'Sofia', 'Valentina', 'Wendy', 'Ximena', 'Yolanda', 'Zara', 'Angela',
    'Maria Ana', 'Ana Maria', 'Carmen Elena', 'Isabel Rosa', 'Rosa Teresa', 'Teresa Elena', 'Elena Patricia', 'Patricia Monica', 'Monica Adriana', 'Adriana Beatriz',
    'Bianca', 'Cristina', 'Dolores', 'Esperanza', 'Francisca', 'Gloria', 'Herminia', 'Imelda', 'Jocelyn', 'Katherine',
    'Leticia', 'Magdalena', 'Nora', 'Ofelia', 'Pilar', 'Rosa', 'Sofia', 'Trinidad', 'Ursula', 'Victoria',
    'Wanda', 'Xenia', 'Yvette', 'Zenaida', 'Alicia', 'Beatriz', 'Carmen', 'Dolores', 'Esperanza', 'Francisca'
  ];

  // Philippine middle names
  const philippineMiddleNames = [
    'Santos', 'Dela Cruz', 'Reyes', 'Mendoza', 'Garcia', 'Torres', 'Rodriguez', 'Lopez', 'Fernandez', 'Silva',
    'Morales', 'Ramos', 'Cruz', 'Martinez', 'Gomez', 'Ruiz', 'Diaz', 'Vega', 'Herrera', 'Luna',
    'Castro', 'Ortega', 'Navarro', 'Jimenez', 'Moreno', 'Valdez', 'Soto', 'Campos', 'Rivera', 'Flores'
  ];

  // Philippine occupations
  const philippineOccupations = [
    'Teacher', 'Nurse', 'Engineer', 'Accountant', 'Doctor', 'Lawyer', 'Business Owner', 'Government Employee',
    'Sales Representative', 'Customer Service Representative', 'IT Professional', 'Marketing Manager',
    'Human Resources Manager', 'Financial Analyst', 'Project Manager', 'Administrative Assistant',
    'Designer', 'Writer', 'Chef', 'Driver', 'Security Guard', 'Janitor', 'Factory Worker', 'Construction Worker',
    'Electrician', 'Plumber', 'Carpenter', 'Mechanic', 'Technician', 'Supervisor', 'Manager', 'Director',
    'President', 'Vice President', 'CEO', 'CFO', 'CTO', 'COO', 'Secretary', 'Receptionist', 'Cashier', 'Waiter'
  ];

  // Philippine workplaces
  const philippineWorkplaces = [
    'SM Mall', 'Robinsons Mall', 'Ayala Malls', 'Megamall', 'Glorietta', 'Greenbelt', 'Bonifacio High Street',
    'UP Diliman', 'Ateneo de Manila University', 'De La Salle University', 'University of Santo Tomas',
    'FEU', 'UE', 'Mapua University', 'San Beda University', 'Letran College', 'Adamson University',
    'Makati Medical Center', 'St. Luke\'s Medical Center', 'Philippine General Hospital', 'East Avenue Medical Center',
    'BDO', 'BPI', 'Metrobank', 'Unionbank', 'Security Bank', 'RCBC', 'PNB', 'Landbank',
    'PLDT', 'Globe', 'Smart', 'Sun Cellular', 'DITO Telecommunity',
    'Jollibee', 'McDonald\'s', 'KFC', 'Chowking', 'Greenwich', 'Mang Inasal', 'Red Ribbon', 'Goldilocks',
    'Nestle Philippines', 'Unilever Philippines', 'Procter & Gamble', 'Coca-Cola Philippines', 'Pepsi Philippines',
    'San Miguel Corporation', 'Ayala Corporation', 'SM Investments Corporation', 'JG Summit Holdings',
    'Government Office', 'Public School', 'Private School', 'Hospital', 'Clinic', 'Pharmacy', 'Bank', 'Restaurant'
  ];

  // Departments and courses as per user specification
  const departments = [
    { name: 'College of Arts & Sciences', code: 'CAS', type: 'ACADEMIC' },
    { name: 'College of Business & Accountancy', code: 'CBA', type: 'ACADEMIC' },
    { name: 'College of Computer Studies', code: 'CCS', type: 'ACADEMIC' },
    { name: 'College of Teacher Education', code: 'CTE', type: 'ACADEMIC' },
    { name: 'College of Maritime Education & Training', code: 'CMET', type: 'ACADEMIC' },
    { name: 'College of Criminology & Administration', code: 'CCA', type: 'ACADEMIC' },
    { name: 'College of Engineering', code: 'COE', type: 'ACADEMIC' },
    { name: 'College of Health Sciences', code: 'CHS', type: 'ACADEMIC' },
    { name: 'International School of Hospitality & Tourism Management', code: 'ISHTM', type: 'ACADEMIC' },
  ];

  // Map of department code to courses (with majors as array if needed)
  const courses = [
    // College of Arts & Sciences (CAS)
    { code: 'ABCom', name: 'Bachelor of Arts in Communication (Masscom)', dept: 'CAS', units: 150 },
    { code: 'ABEng', name: 'Bachelor of Arts in English', dept: 'CAS', units: 150 },
    { code: 'BSM', name: 'Bachelor of Sciences in Mathematics', dept: 'CAS', units: 150 },
    { code: 'BSP', name: 'Bachelor of Sciences in Psychology', dept: 'CAS', units: 150 },

    // College of Business & Accountancy (CBA)
    { code: 'ABA', name: 'Associate in Business Administration', dept: 'CBA', units: 150 },
    { code: 'BSAIS', name: 'Bachelor of Science in Accounting Information System', dept: 'CBA', units: 150 },
    { code: 'BSA', name: 'Bachelor of Sciences in Accountancy', dept: 'CBA', units: 150 },
    { code: 'BSMA', name: 'Bachelor of Science in Management Accounting', dept: 'CBA', units: 150 },
    { code: 'BSREM', name: 'Bachelor of Science in Real Estate Management', dept: 'CBA', units: 150 },
    { code: 'BSIA', name: 'Bachelor of Science in Internal Auditing', dept: 'CBA', units: 150 },
    { code: 'BSBA', name: 'Bachelor of Science in Business Administration', dept: 'CBA', units: 150, majors: [
      'Major in Information Management',
      'Major in Marketing Management',
      'Major in Financial Management',
      'Major in Operations Management',
      'Major in Human Resources Management',
      'Major in Legal Management',
      'Major in Business Economics',
    ] },

    // College of Computer Studies (CCS)
    { code: 'ACT', name: 'Associate in Computer Technology', dept: 'CCS', units: 150 },
    { code: 'BSCS', name: 'Bachelor of Science in Computer Science', dept: 'CCS', units: 150 },
    { code: 'BSIT', name: 'Bachelor of Science in Information Technology', dept: 'CCS', units: 150 },
    { code: 'BSIS', name: 'Bachelor of Science in Information System', dept: 'CCS', units: 150 },

    // College of Teacher Education (CTE)
    { code: 'BECEd', name: 'Bachelor in Early Childhood Education', dept: 'CTE', units: 150 },
    { code: 'BEEd', name: 'Bachelor in Elementary Education', dept: 'CTE', units: 150, majors: [
      'Major in Early Childhood Education',
    ] },
    { code: 'BSEd', name: 'Bachelor in Secondary Education', dept: 'CTE', units: 150, majors: [
      'Major in Information Management',
      'Major in English',
      'Major in Filipino',
      'Major in Mathematics',
      'Major in Science',
    ] },
    { code: 'BTVTEd', name: 'Bachelor in Technical Vocational Teacher Education', dept: 'CTE', units: 150, majors: [
      'Major in Home Economics and Livelihood Education / HELE',
      'Major in Information Communication Technology / ICT',
    ] },

    // College of Maritime Education & Training (CMET)
    { code: 'BSMT', name: 'Bachelor of Sciences in Marine Transportation', dept: 'CMET', units: 150 },

    // College of Criminology & Administration (CCA)
    { code: 'BSC', name: 'Bachelor of Sciences in Criminology', dept: 'CCA', units: 150 },
    { code: 'BSISM', name: 'Bachelor of Sciences in Industrial Security Management', dept: 'CCA', units: 150 },
    { code: 'BSPA', name: 'Bachelor of Sciences in Public Administration', dept: 'CCA', units: 150 },

    // College of Engineering (COE)
    { code: 'BSCE', name: 'Bachelor of Science in Computer Engineering', dept: 'COE', units: 150, majors: [
      'Specializes in CISCO Networking and Robotics Technology',
    ] },
    { code: 'BSELE', name: 'Bachelor of Sciences in Electronics Engineering', dept: 'COE', units: 150, majors: [
      'Specializes in Telecommunication and Broadcasting',
    ] },

    // College of Health Sciences (CHS)
    { code: 'BSMedTech', name: 'Bachelor of Sciences in Medical Technology', dept: 'CHS', units: 150 },

    // International School of Hospitality & Tourism Management (ISHTM)
    { code: 'BSHM', name: 'Bachelor of Sciences in Hospitality Management', dept: 'ISHTM', units: 150 },
    { code: 'BSTM', name: 'Bachelor of Sciences in Tourism Management', dept: 'ISHTM', units: 150 },
  ];

  const subjects = [
    // Computer Science subjects
    { name: 'Programming Fundamentals', code: 'CS101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Data Structures and Algorithms', code: 'CS201', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Database Management Systems', code: 'CS301', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Web Development', code: 'CS401', type: 'LABORATORY', units: 2, hours: 36 },
    { name: 'Software Engineering', code: 'CS501', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Computer Networks', code: 'CS601', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Operating Systems', code: 'CS701', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Programming Laboratory', code: 'CS102', type: 'LABORATORY', units: 1, hours: 18 },
    
    // Information Technology subjects
    { name: 'IT Fundamentals', code: 'IT101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'System Analysis and Design', code: 'IT201', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Network Administration', code: 'IT301', type: 'LABORATORY', units: 2, hours: 36 },
    { name: 'Cybersecurity', code: 'IT401', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'IT Project Management', code: 'IT501', type: 'LECTURE', units: 3, hours: 54 },
    
    // Business subjects
    { name: 'Principles of Management', code: 'BA101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Business Ethics', code: 'BA201', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Marketing Management', code: 'BA301', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Financial Management', code: 'BA401', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Business Law', code: 'BA501', type: 'LECTURE', units: 3, hours: 54 },
    
    // Accountancy subjects
    { name: 'Financial Accounting', code: 'ACC101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Managerial Accounting', code: 'ACC201', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Cost Accounting', code: 'ACC301', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Auditing', code: 'ACC401', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Taxation', code: 'ACC501', type: 'LECTURE', units: 3, hours: 54 },
    
    // Engineering subjects
    { name: 'Engineering Mathematics', code: 'ENG101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Engineering Mechanics', code: 'ENG201', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Engineering Drawing', code: 'ENG301', type: 'LABORATORY', units: 2, hours: 36 },
    { name: 'Strength of Materials', code: 'ENG401', type: 'LECTURE', units: 3, hours: 54 },
    
    // Education subjects
    { name: 'Educational Psychology', code: 'EDU101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Teaching Methods', code: 'EDU201', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Curriculum Development', code: 'EDU301', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Student Teaching', code: 'EDU401', type: 'LABORATORY', units: 2, hours: 36 },
    
    // Nursing subjects
    { name: 'Anatomy and Physiology', code: 'NUR101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Nursing Fundamentals', code: 'NUR201', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Medical-Surgical Nursing', code: 'NUR301', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Nursing Laboratory', code: 'NUR102', type: 'LABORATORY', units: 1, hours: 18 },
    
    // General Education subjects
    { name: 'English Communication', code: 'GE101', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Mathematics in the Modern World', code: 'GE102', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Science, Technology and Society', code: 'GE103', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Philippine History', code: 'GE104', type: 'LECTURE', units: 3, hours: 54 },
    { name: 'Physical Education', code: 'GE105', type: 'LABORATORY', units: 2, hours: 36 },
  ];

  const rooms = [
    { no: 'A101', type: 'LECTURE', capacity: 40, building: 'Academic Building A', floor: '1st Floor' },
    { no: 'A102', type: 'LECTURE', capacity: 40, building: 'Academic Building A', floor: '1st Floor' },
    { no: 'A201', type: 'LECTURE', capacity: 40, building: 'Academic Building A', floor: '2nd Floor' },
    { no: 'A202', type: 'LECTURE', capacity: 40, building: 'Academic Building A', floor: '2nd Floor' },
    { no: 'B101', type: 'LECTURE', capacity: 50, building: 'Academic Building B', floor: '1st Floor' },
    { no: 'B102', type: 'LECTURE', capacity: 50, building: 'Academic Building B', floor: '1st Floor' },
    { no: 'C101', type: 'LABORATORY', capacity: 30, building: 'Computer Lab Building', floor: '1st Floor' },
    { no: 'C102', type: 'LABORATORY', capacity: 30, building: 'Computer Lab Building', floor: '1st Floor' },
    { no: 'C201', type: 'LABORATORY', capacity: 25, building: 'Computer Lab Building', floor: '2nd Floor' },
    { no: 'C202', type: 'LABORATORY', capacity: 25, building: 'Computer Lab Building', floor: '2nd Floor' },
    { no: 'D101', type: 'CONFERENCE', capacity: 100, building: 'Administrative Building', floor: '1st Floor' },
    { no: 'E101', type: 'LABORATORY', capacity: 20, building: 'Engineering Lab', floor: '1st Floor' },
    { no: 'N101', type: 'LABORATORY', capacity: 15, building: 'Nursing Lab', floor: '1st Floor' },
    { no: 'N102', type: 'LABORATORY', capacity: 15, building: 'Nursing Lab', floor: '1st Floor' },
  ];

  return { 
    departments, 
    courses, 
    subjects, 
    rooms,
    philippineAddresses,
    phonePrefixes,
    philippineSurnames,
    philippineFirstNames,
    philippineMiddleNames,
    philippineOccupations,
    philippineWorkplaces
  };
}

// Helper function to generate attendance dates for a semester
function generateAttendanceDates(startDate: Date, endDate: Date, daysOfWeek: string[]) {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    if (daysOfWeek.includes(dayName)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

// Helper function to check if user already exists
async function checkUserExists(userName: string, email: string): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { userName: userName },
        { email: email }
      ]
    }
  });
  return !!existingUser;
}

// Helper function to create user with duplicate checking
async function createUserSafely(userData: {
  userName: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  isEmailVerified: boolean;
}) {
  // Check if user already exists
  const exists = await checkUserExists(userData.userName, userData.email);
  if (exists) {
    throw new Error(`User with userName '${userData.userName}' or email '${userData.email}' already exists`);
  }
  
  return await prisma.user.create({
    data: userData
  });
}

// Helper function to generate realistic attendance status with patterns for semester
function generateAttendanceStatus(studentId: number, date: Date, isRegularStudent: boolean): AttendanceStatus {
  const random = Math.random();
  
  // Add some variation based on day of week (better attendance on certain days)
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Add time-based patterns - attendance varies throughout the semester
  const semesterProgress = (date.getTime() - new Date('2025-08-01').getTime()) / (new Date('2025-10-31').getTime() - new Date('2025-08-01').getTime());
  
  // Add student-specific patterns based on studentId for consistency
  const studentSeed = studentId % 100;
  const studentPattern = (studentSeed / 100) * 0.3; // 0-0.3 variation per student
  
  // Add department-specific patterns (some departments have better attendance)
  const departmentPattern = (studentId % 9) * 0.05; // 0-0.4 variation by department
  
  // Add course-specific patterns (some courses have different attendance rates)
  const coursePattern = (studentId % 5) * 0.03; // 0-0.12 variation by course
  
  // Add monthly patterns - attendance drops mid-semester, improves at end
  let monthlyModifier = 1.0;
  const month = date.getMonth();
  if (month === 8) { // September - mid-semester slump
    monthlyModifier = 0.85;
  } else if (month === 9) { // October - recovery
    monthlyModifier = 0.95;
  }
  
  // Add weekly patterns - attendance varies by week
  const weekOfSemester = Math.floor(semesterProgress * 13); // 13 weeks in semester (Aug-Oct)
  let weeklyModifier = 1.0;
  if (weekOfSemester >= 2 && weekOfSemester <= 4) { // Weeks 3-5: mid-semester slump
    weeklyModifier = 0.85;
  } else if (weekOfSemester >= 8 && weekOfSemester <= 11) { // Weeks 9-12: exam prep and finals
    weeklyModifier = 0.9;
  } else if (weekOfSemester >= 12) { // Final weeks: attendance drops
    weeklyModifier = 0.8;
  }
  
  // Add special event patterns
  let eventModifier = 1.0;
  const dayOfMonth = date.getDate();
  
  // Midterm exam period (around September 30)
  if (month === 8 && dayOfMonth >= 28 && dayOfMonth <= 2) {
    eventModifier = 1.1; // Better attendance during exams
  }
  
  // Final exam period (around October 25)
  if (month === 9 && dayOfMonth >= 23 && dayOfMonth <= 27) {
    eventModifier = 1.15; // Even better attendance during finals
  }
  
  // Holiday periods (lower attendance)
  if ((month === 8 && dayOfMonth === 26) || // National Heroes Day
      (month === 9 && dayOfMonth >= 15 && dayOfMonth <= 17)) { // Mid-semester break
    eventModifier = 0.3; // Much lower attendance on holidays
  }
  
  // Combine all modifiers
  const finalRandom = random * monthlyModifier * weeklyModifier * eventModifier + studentPattern + departmentPattern + coursePattern;
  
  // Regular students have better attendance, especially on weekdays
  if (isRegularStudent) {
    if (isWeekend) {
      // Weekend classes have slightly lower attendance
      if (finalRandom < 0.80) return AttendanceStatus.PRESENT;
      if (finalRandom < 0.88) return AttendanceStatus.LATE;
      if (finalRandom < 0.92) return AttendanceStatus.EXCUSED;
      return AttendanceStatus.ABSENT;
    } else {
      // Weekday classes have better attendance
      if (finalRandom < 0.88) return AttendanceStatus.PRESENT;
      if (finalRandom < 0.94) return AttendanceStatus.LATE;
      if (finalRandom < 0.97) return AttendanceStatus.EXCUSED;
      return AttendanceStatus.ABSENT;
    }
  } else {
    // Irregular students have more varied attendance
    if (isWeekend) {
      if (finalRandom < 0.65) return AttendanceStatus.PRESENT;
      if (finalRandom < 0.75) return AttendanceStatus.LATE;
      if (finalRandom < 0.80) return AttendanceStatus.EXCUSED;
      return AttendanceStatus.ABSENT;
    } else {
      if (finalRandom < 0.75) return AttendanceStatus.PRESENT;
      if (finalRandom < 0.85) return AttendanceStatus.LATE;
      if (finalRandom < 0.90) return AttendanceStatus.EXCUSED;
      return AttendanceStatus.ABSENT;
    }
  }
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.rFIDTagAssignmentLog.deleteMany({});
  await prisma.attendanceNotification.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.systemLogs.deleteMany({});
  await prisma.reportLog.deleteMany({});
  await prisma.rFIDReaderLogs.deleteMany({});
  await prisma.rFIDLogs.deleteMany({});
  await prisma.rFIDReader.deleteMany({});
  await prisma.rFIDTags.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.studentSchedule.deleteMany({});
  await prisma.subjectSchedule.deleteMany({});
  await prisma.studentSection.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.subjects.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.guardian.deleteMany({});
  await prisma.instructor.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.courseOffering.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.systemBackup.deleteMany({});
  await prisma.restorePoint.deleteMany({});
  await prisma.backupLog.deleteMany({});
  await prisma.backupScheduleLog.deleteMany({});
  await prisma.backupSchedule.deleteMany({});
  await prisma.backupSettings.deleteMany({});
  await prisma.emailRecipient.deleteMany({});
  await prisma.email.deleteMany({});
  // Delete notifications before users
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});

  const collegeData = generateRealisticCollegeData();

  // 1. Create Admin Users
  console.log('👥 Creating admin users...');
  const adminUsers = [];
  for (let i = 0; i < 5; i++) {
    try {
      adminUsers.push(await createUserSafely({
        userName: `admin${i + 1}`,
        email: `admin${i + 1}@icct.edu.ph`,
        passwordHash: '$2b$10$hashedpassword',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      }));
    } catch (error) {
      console.error(`❌ Failed to create admin user ${i + 1}:`, error);
      throw error;
    }
  }


  // 2. Create Departments
  console.log('🏢 Creating departments...');
  const departments = [];
  for (const dept of collegeData.departments) {
    departments.push(await prisma.department.create({
      data: {
        departmentName: dept.name,
        departmentCode: dept.code,
        departmentType: dept.type as DepartmentType,
        departmentDescription: `${dept.name} Department`,
        departmentStatus: Status.ACTIVE,
        headOfDepartment: adminUsers[0].userId,
        location: `${dept.name} Building`,
        contactEmail: `${dept.code.toLowerCase()}@icct.edu.ph`,
        contactPhone: faker.phone.number(),
      }
    }));
  }

  // 3. Create Trimesters
  console.log('📅 Creating trimesters...');
  const trimesters = [
    {
      name: 'Current Semester 2025',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-10-31'),
      year: 2025,
      semesterType: 'FIRST_SEMESTER',
      registrationStart: new Date('2025-07-15'),
      registrationEnd: new Date('2025-07-30'),
      enrollmentStart: new Date('2025-07-20'),
      enrollmentEnd: new Date('2025-07-30'),
    },
    {
      name: 'Previous Semester 2025',
      startDate: new Date('2025-05-15'),
      endDate: new Date('2025-07-31'),
      year: 2025,
      semesterType: 'SECOND_SEMESTER',
      registrationStart: new Date('2025-04-15'),
      registrationEnd: new Date('2025-05-10'),
      enrollmentStart: new Date('2025-04-20'),
      enrollmentEnd: new Date('2025-05-10'),
    },
    {
      name: 'Next Semester 2026',
      startDate: new Date('2026-02-03'),
      endDate: new Date('2026-05-30'),
      year: 2026,
      semesterType: 'THIRD_SEMESTER',
      registrationStart: new Date('2026-01-15'),
      registrationEnd: new Date('2026-02-01'),
      enrollmentStart: new Date('2026-01-20'),
      enrollmentEnd: new Date('2026-02-02'),
    }
  ];

  const createdTrimesters = [];
  for (const trimester of trimesters) {
    createdTrimesters.push(await prisma.semester.create({
      data: {
        startDate: trimester.startDate,
        endDate: trimester.endDate,
        year: trimester.year,
        semesterType: trimester.semesterType as SemesterType,
        status: trimester.name === 'First Trimester' ? SemesterStatus.CURRENT : SemesterStatus.UPCOMING,
        isActive: trimester.name === 'First Trimester',
        registrationStart: trimester.registrationStart,
        registrationEnd: trimester.registrationEnd,
        enrollmentStart: trimester.enrollmentStart,
        enrollmentEnd: trimester.enrollmentEnd,
      }
    }));
  }

  const currentTrimester = createdTrimesters[0]; // First Trimester is current

  // 4. Create Course Offerings for all trimesters
  console.log('📚 Creating course offerings for all trimesters...');
  const allCourseOfferings = [];
  const usedCourseCodes = new Set();
  const stopwords = ['in', 'and', 'of', 'the', 'specializes', 'major', 'management', 'education', 'livelihood', 'communication', 'technology', 'broadcasting', 'cisco', 'networking', 'robotics'];
  
  for (const trimester of createdTrimesters) {
    for (const course of collegeData.courses) {
      const dept = departments.find(d => d.departmentCode === course.dept);
      if (!dept) continue; // skip if department not found
      if (course.majors && Array.isArray(course.majors)) {
        for (const major of course.majors) {
          // Generate a cleaned code for each major
          let majorSuffix = major
            .replace(/Major in |Specializes in |\//gi, '')
            .split(' ')
            .filter(word => word && !stopwords.includes(word.toLowerCase()))
            .map(word => word[0])
            .join('')
            .toUpperCase();
          if (majorSuffix.length < 2) {
            const words = major.trim().split(' ');
            majorSuffix = words[words.length - 1].substring(0, 3).toUpperCase();
          }
          let uniqueCourseCode = `${course.code}-${majorSuffix}`;
          let idx = 1;
          while (usedCourseCodes.has(uniqueCourseCode)) {
            uniqueCourseCode = `${course.code}-${majorSuffix}${idx}`;
            idx++;
          }
          usedCourseCodes.add(uniqueCourseCode);
          allCourseOfferings.push(await prisma.courseOffering.create({
            data: {
              courseCode: uniqueCourseCode,
              courseName: course.name,
              courseType: 'MANDATORY',
              courseStatus: 'ACTIVE',
              description: `${course.name} program (${major})`,
              departmentId: dept.departmentId,
              totalUnits: course.units,
              major: major,
            }
          }));
        }
      } else {
        let uniqueCourseCode = `${course.code}`;
        let idx = 1;
        while (usedCourseCodes.has(uniqueCourseCode)) {
          uniqueCourseCode = `${course.code}${idx}`;
          idx++;
        }
        usedCourseCodes.add(uniqueCourseCode);
        allCourseOfferings.push(await prisma.courseOffering.create({
          data: {
            courseCode: uniqueCourseCode,
            courseName: course.name,
            courseType: CourseType.MANDATORY,
            courseStatus: CourseStatus.ACTIVE,
            description: `${course.name} program`,
            departmentId: dept.departmentId,
            totalUnits: course.units,
            major: null,
          }
        }));
      }
    }
  }

  // 5. Create Instructors (at least 10 per department)
  console.log('👨‍🏫 Creating instructors...');
  const instructors: any[] = [];
  let instructorCounter = 0; // Global counter to ensure uniqueness across all departments
  const usedInstructorNames = new Set<string>(); // Track used instructor names
  const usedInstructorEmails = new Set<string>(); // Track used instructor emails
  
  for (const dept of departments) {
    for (let i = 0; i < 10; i++) {
      let firstName, lastName, userName, email;
      let attempts = 0;
      
      // Ensure unique instructor names and emails
      do {
        firstName = faker.person.firstName();
        lastName = faker.person.lastName();
        instructorCounter++;
        userName = `${firstName.toLowerCase().replace(/\s+/g, '')}${lastName.toLowerCase().replace(/\s+/g, '')}${instructorCounter}`;
        email = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}${instructorCounter}@icct.edu.ph`;
        attempts++;
      } while ((usedInstructorNames.has(userName) || usedInstructorEmails.has(email)) && attempts < 50);
      
      if (attempts >= 50) {
        // Fallback: add more unique identifiers
        userName = `${firstName.toLowerCase().replace(/\s+/g, '')}${lastName.toLowerCase().replace(/\s+/g, '')}${instructorCounter}${dept.departmentCode}${i}`;
        email = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}${instructorCounter}${dept.departmentCode}${i}@icct.edu.ph`;
      }
      
      usedInstructorNames.add(userName);
      usedInstructorEmails.add(email);
      
      try {
        const user = await createUserSafely({
          userName: userName,
          email: email,
          passwordHash: '$2b$10$hashedpassword',
          role: Role.INSTRUCTOR,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
        });
        instructors.push(await prisma.instructor.create({
          data: {
            instructorId: user.userId,
            employeeId: `EMP-${user.userId}`,
            email: user.email,
            phoneNumber: faker.phone.number(),
            firstName: firstName,
            middleName: faker.person.middleName(),
            lastName: lastName,
            gender: faker.helpers.arrayElement([UserGender.MALE, UserGender.FEMALE]),
            instructorType: faker.helpers.arrayElement([InstructorType.FULL_TIME, InstructorType.PART_TIME]),
            status: Status.ACTIVE,
            departmentId: dept.departmentId,
            officeLocation: `${dept.departmentName} Building, Room ${faker.number.int({ min: 100, max: 300 })}`,
            officeHours: `${faker.number.int({ min: 8, max: 10 })}:00 AM - ${faker.number.int({ min: 4, max: 6 })}:00 PM`,
            specialization: faker.helpers.arrayElement(['Programming', 'Database', 'Networking', 'Web Development', 'Software Engineering', 'Cybersecurity']),
            rfidTag: `INSTR${dept.departmentCode}${String(i + 1).padStart(3, '0')}`,
          }
        }));
      } catch (error) {
        console.error(`❌ Failed to create instructor ${firstName} ${lastName} in ${dept.departmentName}:`, error);
        throw error;
      }
    }
  }

  // 6. Create Guardians
  console.log('👨‍👩‍👧‍👦 Creating guardians...');
  const guardians = [] as { guardianId: number }[];
  const guardianRelationships = ['Parent', 'Grandparent', 'Legal Guardian', 'Uncle', 'Aunt', 'Sibling', 'Other Relative'];

  for (let i = 0; i < 50; i++) {
    const firstName = collegeData.philippineFirstNames[Math.floor(Math.random() * collegeData.philippineFirstNames.length)];
    const lastName = collegeData.philippineSurnames[Math.floor(Math.random() * collegeData.philippineSurnames.length)];
    const middleName = collegeData.philippineMiddleNames[Math.floor(Math.random() * collegeData.philippineMiddleNames.length)];
    const address = collegeData.philippineAddresses[Math.floor(Math.random() * collegeData.philippineAddresses.length)];
    const phonePrefix = collegeData.phonePrefixes[Math.floor(Math.random() * collegeData.phonePrefixes.length)];
    const phoneNumber = `${phonePrefix}${String(i + 1).padStart(7, '0')}`;
    const occupation = collegeData.philippineOccupations[Math.floor(Math.random() * collegeData.philippineOccupations.length)];
    const workplace = collegeData.philippineWorkplaces[Math.floor(Math.random() * collegeData.philippineWorkplaces.length)];
    const relationship = guardianRelationships[Math.floor(Math.random() * guardianRelationships.length)];

    const guardian = await prisma.guardian.create({
      data: {
        email: `guardian${i + 1}@email.com`,
        phoneNumber: phoneNumber,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        gender: faker.helpers.arrayElement([UserGender.MALE, UserGender.FEMALE]),
        guardianType: GuardianType.PARENT,
        status: Status.ACTIVE,
        address: address,
        occupation: occupation,
        workplace: workplace,
        emergencyContact: phoneNumber,
        relationshipToStudent: relationship,
        totalStudents: 1,
      }
    });

    guardians.push({ guardianId: guardian.guardianId });
  }

  // 7. Create Students with unique names and proper semester attendance
  console.log('👨‍🎓 Creating students with unique names...');
  const students: any[] = [];
  const totalSections = allCourseOfferings.length * 5;
  const totalStudents = totalSections * 20; // 20 students per section
  
  console.log(`📊 Planning to create ${totalStudents} students for ${totalSections} sections`);
  
  // Track used names, usernames, and emails to ensure uniqueness
  const usedNames = new Set<string>();
  const usedUserNames = new Set<string>();
  const usedEmails = new Set<string>();
  
  for (let i = 0; i < totalStudents; i++) {
    let firstName, lastName, middleName, userName, email;
    let fullName;
    let attempts = 0;
    
    // Ensure unique names, usernames, and emails
    do {
      firstName = collegeData.philippineFirstNames[Math.floor(Math.random() * collegeData.philippineFirstNames.length)];
      lastName = collegeData.philippineSurnames[Math.floor(Math.random() * collegeData.philippineSurnames.length)];
      middleName = collegeData.philippineMiddleNames[Math.floor(Math.random() * collegeData.philippineMiddleNames.length)];
      fullName = `${firstName} ${middleName} ${lastName}`;
      userName = `${firstName.toLowerCase().replace(/\s+/g, '')}${lastName.toLowerCase().replace(/\s+/g, '')}${i + 1}`;
      email = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}${i + 1}@student.icct.edu.ph`;
      attempts++;
    } while ((usedNames.has(fullName) || usedUserNames.has(userName) || usedEmails.has(email)) && attempts < 100);
    
    if (attempts >= 100) {
      // Fallback: add more unique identifiers
      fullName = `${firstName} ${middleName} ${lastName} ${i + 1}`;
      userName = `${firstName.toLowerCase().replace(/\s+/g, '')}${lastName.toLowerCase().replace(/\s+/g, '')}${i + 1}${Date.now()}`;
      email = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}${i + 1}${Date.now()}@student.icct.edu.ph`;
    }
    
    usedNames.add(fullName);
    usedUserNames.add(userName);
    usedEmails.add(email);
    
    const address = collegeData.philippineAddresses[Math.floor(Math.random() * collegeData.philippineAddresses.length)];
    const phonePrefix = collegeData.phonePrefixes[Math.floor(Math.random() * collegeData.phonePrefixes.length)];
    // Guarantee unique phone number by appending index
    const phoneNumber = `${phonePrefix}${String(i + 1).padStart(7, '0')}`;
    
    try {
      const user = await createUserSafely({
        userName: userName,
        email: email,
        passwordHash: '$2b$10$hashedpassword',
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      });
      students.push(await prisma.student.create({
        data: {
          studentIdNum: `2025-${String(i + 1).padStart(5, '0')}`,
          rfidTag: `STUD${String(i + 1).padStart(5, '0')}`,
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
          email: user.email,
          phoneNumber: phoneNumber,
          address: address,
          gender: faker.helpers.arrayElement([UserGender.MALE, UserGender.FEMALE]),
          studentType: faker.helpers.arrayElement([StudentType.REGULAR, StudentType.IRREGULAR]),
          status: Status.ACTIVE,
          yearLevel: faker.helpers.arrayElement([yearLevel.FIRST_YEAR, yearLevel.SECOND_YEAR, yearLevel.THIRD_YEAR, yearLevel.FOURTH_YEAR]),
          birthDate: faker.date.between({ from: new Date('1995-01-01'), to: new Date('2007-12-31') }),
          nationality: 'Filipino',
          suffix: null,
          userId: user.userId,
          guardianId: guardians[i % guardians.length].guardianId,
        }
      }));
    } catch (error) {
      console.error(`❌ Failed to create student ${firstName} ${lastName}:`, error);
      throw error;
    }
  }

  // 8. Create Sections (5 per course offering)
  console.log('📋 Creating sections...');
  const sections: any[] = [];
  for (const course of allCourseOfferings) {
    for (let j = 0; j < 5; j++) {
      sections.push(await prisma.section.create({
      data: {
          sectionName: `${course.courseCode}-S${String(j + 1).padStart(2, '0')}`,
          sectionCapacity: 20,
          sectionStatus: SectionStatus.ACTIVE,
          yearLevel: faker.number.int({ min: 1, max: 4 }),
          currentEnrollment: 20,
          courseId: course.courseId,
          semesterId: currentTrimester.semesterId, // Use currentTrimester's semesterId
          academicYear: '2025-2026',
          semester: SemesterType.FIRST_SEMESTER,
        }
      }));
    }
  }

  // 9. Assign students to sections (20 per section, assign department/courseId)
  console.log('📝 Enrolling students in sections...');
  let studentIdx = 0;
  for (const section of sections) {
    const course = allCourseOfferings.find(c => c.courseId === section.courseId);
    const deptId = course ? course.departmentId : undefined;
    const trimester = createdTrimesters.find(t => t.semesterId === section.semesterId);
    for (let i = 0; i < 20; i++) { // Reduced from 100 to 20
      if (studentIdx >= students.length) break;
      const student = students[studentIdx];
      await prisma.studentSection.create({
      data: {
          studentId: student.studentId,
          sectionId: section.sectionId,
          enrollmentStatus: EnrollmentStatus.ACTIVE,
          enrollmentDate: faker.date.between({ from: trimester!.registrationStart!, to: trimester!.enrollmentEnd! }),
          isRegular: student.studentType === StudentType.REGULAR,
        }
      });
      // Assign department and courseId to student
      await prisma.student.update({
        where: { studentId: student.studentId },
        data: { departmentId: deptId, courseId: section.courseId },
      });
      studentIdx++;
    }
  }

  // 10. Create Subjects (5 per course offering)
  console.log('📖 Creating subjects...');
  const subjects: any[] = [];
  for (const course of allCourseOfferings) {
    for (let k = 0; k < 5; k++) { // Reduced from 10 to 5
      subjects.push(await prisma.subjects.create({
      data: {
          subjectName: `${course.courseName} Subject ${k + 1}`,
          subjectCode: `${course.courseCode}-SUBJ${k + 1}`,
          subjectType: faker.helpers.arrayElement([SubjectType.LECTURE, SubjectType.LABORATORY]),
          status: SubjectStatus.ACTIVE,
          description: `${course.courseName} Subject ${k + 1}`,
          lectureUnits: 3,
          labUnits: 2,
          creditedUnits: 3,
          totalHours: 54,
        prerequisites: '',
          courseId: course.courseId,
          departmentId: course.departmentId,
          academicYear: '2025-2026',
          semester: SemesterType.FIRST_SEMESTER,
          maxStudents: 20,
        }
      }));
    }
  }

  // 11. Create Rooms (100 rooms shared across all schedules)
  console.log('🏫 Creating rooms...');
  const rooms: any[] = [];
  const totalRooms = 100;
  for (let i = 0; i < totalRooms; i++) {
    const roomType = i < 60 ? 'LECTURE' : i < 85 ? 'LABORATORY' : i < 95 ? 'CONFERENCE' : 'OFFICE';
    const capacity = roomType === 'LECTURE' ? faker.number.int({ min: 30, max: 80 }) :
                   roomType === 'LABORATORY' ? faker.number.int({ min: 20, max: 40 }) :
                   roomType === 'CONFERENCE' ? faker.number.int({ min: 50, max: 150 }) :
                   faker.number.int({ min: 25, max: 35 });
    // Use enums for building and floor
    const buildingEnum = [RoomBuilding.BuildingA, RoomBuilding.BuildingB, RoomBuilding.BuildingC, RoomBuilding.BuildingD, RoomBuilding.BuildingE][i % 5];
    const floorEnum = [RoomFloor.F1, RoomFloor.F2, RoomFloor.F3, RoomFloor.F4, RoomFloor.F5, RoomFloor.F6][i % 6];
    rooms.push(await prisma.room.create({
        data: {
        roomNo: `${roomType === 'LECTURE' ? 'L' : roomType === 'LABORATORY' ? 'LAB' : roomType === 'CONFERENCE' ? 'CONF' : 'OFF'}${String(i + 1).padStart(3, '0')}`,
        roomType: roomType as RoomType,
        roomCapacity: capacity,
        roomBuildingLoc: buildingEnum,
        roomFloorLoc: floorEnum,
        readerId: `READER-${String(i + 1).padStart(3, '0')}`,
        status: RoomStatus.AVAILABLE,
        isActive: true,
        lastMaintenance: faker.date.past(),
        nextMaintenance: faker.date.future(),
      }
    }));
  }

  // 12. Create Subject Schedules (multiple schedules per subject for different time slots)
  console.log('📅 Creating subject schedules...');
  const subjectSchedules: any[] = [];
  const timeSlots = [
    { start: '07:30', end: '09:30', label: 'MORNING' },
    { start: '10:00', end: '12:00', label: 'LATE_MORNING' },
    { start: '13:00', end: '15:00', label: 'AFTERNOON' },
    { start: '15:30', end: '17:30', label: 'LATE_AFTERNOON' },
    { start: '18:00', end: '20:00', label: 'EVENING' },
  ];
  const daysOfWeek: ('MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY')[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  
  for (const subject of subjects) {
    const course = allCourseOfferings.find(c => c.courseId === subject.courseId);
    if (!course) continue; // skip if course not found
    // Find a section for this subject (sections are linked to semester)
    const courseSections = sections.filter(s => s.courseId === course.courseId);
    if (courseSections.length === 0) continue;
    const section = courseSections[0]; // pick the first section for this subject
    const trimester = createdTrimesters.find(t => t.semesterId === section.semesterId);
    if (!trimester) continue;
    const deptInstructors = instructors.filter(i => i.departmentId === course.departmentId);
    if (deptInstructors.length === 0) continue;
    
    // Create multiple schedules for each subject (morning, noon, evening)
    for (let timeSlotIndex = 0; timeSlotIndex < timeSlots.length; timeSlotIndex++) {
      const timeSlot = timeSlots[timeSlotIndex];
      const section = courseSections[timeSlotIndex % courseSections.length];
      const instructor = deptInstructors[timeSlotIndex % deptInstructors.length];
      const day = daysOfWeek[timeSlotIndex % daysOfWeek.length];

      // Find a room that is not already booked for this day/time
      let availableRoom = null;
      for (const room of rooms) {
        // Check if this room is already booked for the same day and overlapping time
        const hasOverlap = subjectSchedules.some(s =>
          s.roomId === room.roomId &&
          s.day === day &&
          (
            (timeSlot.start < s.endTime && timeSlot.end > s.startTime) // times overlap
          )
        );
        
        if (!hasOverlap) {
          availableRoom = room;
          break;
        }
      }
      
      // If no room found, try to find a room with different time slots
      if (!availableRoom) {
        // Try different time slots for the same day
        const alternativeTimeSlots = [
          { start: '08:00', end: '10:00' },
          { start: '10:30', end: '12:30' },
          { start: '13:30', end: '15:30' },
          { start: '16:00', end: '18:00' },
          { start: '18:30', end: '20:30' }
        ];
        
        for (const altTimeSlot of alternativeTimeSlots) {
          for (const room of rooms) {
            const hasOverlap = subjectSchedules.some(s =>
              s.roomId === room.roomId &&
              s.day === day &&
              (
                (altTimeSlot.start < s.endTime && altTimeSlot.end > s.startTime)
              )
            );
            
            if (!hasOverlap) {
              availableRoom = room;
              timeSlot.start = altTimeSlot.start;
              timeSlot.end = altTimeSlot.end;
              break;
            }
          }
          if (availableRoom) break;
        }
      }
      
      // If still no room found, skip this schedule
      if (!availableRoom) {
        console.warn('No available room for', day, timeSlot, 'skipping schedule');
        continue;
      }

      const newSchedule = await prisma.subjectSchedule.create({
        data: {
          subject: { connect: { subjectId: subject.subjectId } },
          section: { connect: { sectionId: section.sectionId } },
          instructor: { connect: { instructorId: instructor.instructorId } },
          room: { connect: { roomId: availableRoom.roomId } },
          semester: { connect: { semesterId: section.semesterId } }, // Use section.semesterId
          day: day,
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          slots: 100,
          scheduleType: ScheduleType.REGULAR,
          status: ScheduleStatus.ACTIVE,
          academicYear: '2025-2026',
          startDate: trimester.startDate,
          endDate: trimester.endDate,
          maxStudents: 100,
        }
      });
      
      subjectSchedules.push(newSchedule);
      console.log(`✅ Created schedule: ${day} ${timeSlot.start}-${timeSlot.end} in Room ${availableRoom.roomNo}`);
    }
  }

  // 12.5. Create Student Schedules (enroll students in subject schedules)
  console.log('📚 Enrolling students in subject schedules...');
  const studentSchedules: any[] = [];
  let studentScheduleIdx = 0;
  
  // Get all student-section enrollments to properly align students with their sections
  const studentSectionEnrollments = await prisma.studentSection.findMany({
    include: {
      Student: true,
      Section: true
    }
  });
  
  console.log(`📊 Found ${studentSectionEnrollments.length} student-section enrollments`);
  console.log(`📊 Found ${subjectSchedules.length} subject schedules`);
  
  for (const subjectSchedule of subjectSchedules) {
    // Get students enrolled in the same section as this subject schedule
    const sectionStudents = studentSectionEnrollments
      .filter(enrollment => enrollment.sectionId === subjectSchedule.sectionId)
      .map(enrollment => enrollment.Student);
    
    console.log(`📚 Section ${subjectSchedule.sectionId} has ${sectionStudents.length} students`);
    
    // Enroll each student in this subject schedule
    for (const student of sectionStudents) {
      studentSchedules.push(await prisma.studentSchedule.create({
        data: {
          studentId: student.studentId,
          scheduleId: subjectSchedule.subjectSchedId,
          status: ScheduleStatus.ACTIVE,
          enrolledAt: faker.date.between({ 
            from: currentTrimester.registrationStart!, 
            to: currentTrimester.enrollmentEnd! 
          }),
          notes: `Enrolled in subject schedule`,
        }
      }));
      studentScheduleIdx++;
    }
  }

  // 13. Generate Attendance Data for a focused 3-month semester
  console.log('📊 Generating comprehensive attendance data for 3-month semester...');
  const attendanceRecords = [];
  
  // Define the focused semester date range: 3 months from current trimester
  const semesterStartDate = currentTrimester.startDate;
  const semesterEndDate = currentTrimester.endDate;
  
  console.log(`📅 Generating attendance from ${semesterStartDate.toLocaleDateString()} to ${semesterEndDate.toLocaleDateString()}`);
  
  for (const subjectSchedule of subjectSchedules) {
    // Get students enrolled in the same section as this subject schedule
    const scheduleStudents = studentSectionEnrollments
      .filter(enrollment => enrollment.sectionId === subjectSchedule.sectionId)
      .map(enrollment => enrollment.Student);
    const course = allCourseOfferings.find(c => c.courseId === sections.find(s => s.sectionId === subjectSchedule.sectionId)?.courseId);
    const section = sections.find(s => s.sectionId === subjectSchedule.sectionId);
    const trimester = section ? createdTrimesters.find(t => t.semesterId === section.semesterId) : null;
    if (!trimester) continue;
    
    // Generate attendance for the focused semester period only
    const dayName = subjectSchedule.day;
    const attendanceDates = generateAttendanceDates(
      semesterStartDate,
      semesterEndDate,
      [dayName]
    );

    for (const date of attendanceDates) {
      // Then create student attendance for the same occurrence
      for (const student of scheduleStudents) {
        const isRegularStudent = student.studentType === StudentType.REGULAR;
        const status = generateAttendanceStatus(student.studentId, date, isRegularStudent);

        // Skip some dates to create realistic absence patterns
        if (status === AttendanceStatus.ABSENT && Math.random() < 0.3) continue;

        const timestamp = new Date(date);
        timestamp.setHours(
          parseInt(subjectSchedule.startTime.split(':')[0]),
          parseInt(subjectSchedule.startTime.split(':')[1]),
          0,
          0
        );

        // Add more realistic variation to arrival times based on status and patterns
        if (status === AttendanceStatus.LATE) {
          // Late arrivals: 5-45 minutes late, with some very late (1-2 hours)
          const lateMinutes = Math.random() < 0.1 ? faker.number.int({ min: 60, max: 120 }) : faker.number.int({ min: 5, max: 45 });
          timestamp.setMinutes(timestamp.getMinutes() + lateMinutes);
        } else if (status === AttendanceStatus.PRESENT) {
          // Present: arrive 10 minutes early to 5 minutes late
          timestamp.setMinutes(timestamp.getMinutes() + faker.number.int({ min: -10, max: 5 }));
        } else if (status === AttendanceStatus.ABSENT) {
          // Absent: no timestamp variation needed, but add some random time for records
          timestamp.setMinutes(timestamp.getMinutes() + faker.number.int({ min: 0, max: 5 }));
        }
        
        // Add some random variation to make timestamps more realistic
        timestamp.setSeconds(faker.number.int({ min: 0, max: 59 }));
        timestamp.setMilliseconds(faker.number.int({ min: 0, max: 999 }));

        attendanceRecords.push({
          subjectSchedId: subjectSchedule.subjectSchedId,
          studentId: student.studentId,
          userId: student.userId,
          userRole: Role.STUDENT,
          status: status,
          attendanceType: AttendanceType.RFID_SCAN,
          verification: AttendanceVerification.VERIFIED,
          timestamp: timestamp,
          semesterId: trimester.semesterId,
        });
      }
    }
  }

  // Instructor attendance is now aligned to subject schedules above; no separate generation needed

  // Insert attendance records in batches
  const batchSize = 100;
  for (let i = 0; i < attendanceRecords.length; i += batchSize) {
    const batch = attendanceRecords.slice(i, i + batchSize);
    await prisma.attendance.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  // 15. Create RFID Tags
  console.log('🏷️ Creating RFID tags...');
  const createdTags = [];
  for (const student of students) {
    try {
      const tag = await prisma.rFIDTags.create({
        data: {
          tagNumber: student.rfidTag,
          tagType: TagType.STUDENT_CARD,
          assignedAt: faker.date.past(),
          status: RFIDStatus.ACTIVE,
          studentId: student.studentId,
          assignedBy: adminUsers[0].userId,
          assignmentReason: 'Initial assignment',
        }
      });
      createdTags.push(tag);
      
      // Create assignment log entry for each tag
      await prisma.rFIDTagAssignmentLog.create({
        data: {
          tagId: tag.tagId,
          action: 'ASSIGN',
          assignedToType: 'STUDENT',
          assignedToId: student.studentId,
          assignedToName: `${student.firstName} ${student.lastName}`,
          performedBy: adminUsers[0].userId,
          performedByName: 'System Admin',
          timestamp: tag.assignedAt,
          notes: `Initial RFID tag assignment for student ${student.studentIdNum}`,
        }
      });
    } catch (error) {
      console.error(`❌ Failed to create RFID tag for student ${student.studentIdNum}:`, error);
      throw error;
    }
  }
  console.log(`✅ Created ${createdTags.length} RFID tags for students`);

  // 15.5. Create RFID Tags for Instructors
  console.log('🏷️ Creating RFID tags for instructors...');
  const instructorTags = [];
  for (const instructor of instructors) {
    try {
      const tag = await prisma.rFIDTags.create({
        data: {
          tagNumber: instructor.rfidTag,
          tagType: TagType.TEMPORARY_PASS, // Using TEMPORARY_PASS for instructors since there's no INSTRUCTOR_CARD type
          assignedAt: faker.date.past(),
          status: RFIDStatus.ACTIVE,
          assignedBy: adminUsers[0].userId,
          assignmentReason: 'Initial instructor assignment',
          notes: `Instructor: ${instructor.firstName} ${instructor.lastName} (${instructor.employeeId})`,
        }
      });
      instructorTags.push(tag);
      
      // Create assignment log entry for each instructor tag
      await prisma.rFIDTagAssignmentLog.create({
        data: {
          tagId: tag.tagId,
          action: 'ASSIGN',
          assignedToType: 'INSTRUCTOR',
          assignedToId: instructor.instructorId,
          assignedToName: `${instructor.firstName} ${instructor.lastName}`,
          performedBy: adminUsers[0].userId,
          performedByName: 'System Admin',
          timestamp: tag.assignedAt,
          notes: `Initial RFID tag assignment for instructor ${instructor.employeeId}`,
        }
      });
    } catch (error) {
      console.error(`❌ Failed to create RFID tag for instructor ${instructor.employeeId}:`, error);
      throw error;
    }
  }
  console.log(`✅ Created ${instructorTags.length} RFID tags for instructors`);

  // 16. Create RFID Readers
  console.log('📡 Creating RFID readers...');
  for (const room of rooms) {
    await prisma.rFIDReader.create({
      data: {
        roomId: room.roomId,
        deviceId: room.readerId,
        deviceName: `RFID Reader ${room.roomNo}`,
        components: { antenna: 'Omni-directional', power: 'AC' },
        assemblyDate: faker.date.past(),
        lastCalibration: faker.date.past(),
        nextCalibration: faker.date.future(),
        ipAddress: faker.internet.ip(),
        status: ReaderStatus.ACTIVE,
        lastSeen: faker.date.recent(),
        testResults: { signal: 'Strong', battery: 'Good' },
      }
    });
  }

  // 17. Create Philippine holidays and events
  console.log('📅 Creating Philippine holidays and events...');
  const events = [
    // Academic Events
    {
      title: 'Freshman Orientation',
      description: 'Welcome event for new students',
      eventType: 'ORIENTATION',
      eventDate: new Date('2024-12-01'),
      location: 'Main Auditorium',
      capacity: 500,
    },
    {
      title: 'Midterm Examinations',
      description: 'Midterm examination period',
      eventType: 'ACADEMIC',
      eventDate: new Date('2025-06-15'),
      location: 'Various Classrooms',
      capacity: 1000,
    },
    {
      title: 'Final Examinations',
      description: 'Final examination period',
      eventType: 'ACADEMIC',
      eventDate: new Date('2025-10-25'),
      location: 'Various Classrooms',
      capacity: 1000,
    },
    {
      title: 'Graduation Ceremony',
      description: 'Annual graduation ceremony for graduating students',
      eventType: 'GRADUATION',
      eventDate: new Date('2026-05-15'),
      location: 'Main Auditorium',
      capacity: 800,
    },
    {
      title: 'Academic Awards Ceremony',
      description: 'Recognition of outstanding students',
      eventType: 'ACADEMIC',
      eventDate: new Date('2026-05-10'),
      location: 'Main Auditorium',
      capacity: 600,
    },
    
    // Philippine National Holidays 2024
    {
      title: 'New Year\'s Day',
      description: 'New Year celebration and holiday',
      eventType: 'SOCIAL',
      eventDate: new Date('2024-01-01'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Araw ng Kagitingan (Day of Valor)',
      description: 'Commemoration of the Fall of Bataan',
      eventType: 'OTHER',
      eventDate: new Date('2024-04-09'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Maundy Thursday',
      description: 'Holy Thursday - Easter Week',
      eventType: 'OTHER',
      eventDate: new Date('2024-03-28'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Good Friday',
      description: 'Holy Friday - Easter Week',
      eventType: 'OTHER',
      eventDate: new Date('2024-03-29'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Easter Sunday',
      description: 'Easter celebration',
      eventType: 'OTHER',
      eventDate: new Date('2024-03-31'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Labor Day',
      description: 'International Workers\' Day',
      eventType: 'OTHER',
      eventDate: new Date('2024-05-01'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Independence Day',
      description: 'Philippine Independence Day',
      eventType: 'OTHER',
      eventDate: new Date('2024-06-12'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'National Heroes Day',
      description: 'Commemoration of Philippine heroes',
      eventType: 'OTHER',
      eventDate: new Date('2024-08-26'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Bonifacio Day',
      description: 'Birth anniversary of Andres Bonifacio',
      eventType: 'OTHER',
      eventDate: new Date('2024-11-30'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Christmas Day',
      description: 'Christmas celebration',
      eventType: 'SOCIAL',
      eventDate: new Date('2024-12-25'),
      location: 'Campus-wide',
      capacity: 0,
    },
    {
      title: 'Rizal Day',
      description: 'Birth anniversary of Jose Rizal',
      eventType: 'OTHER',
      eventDate: new Date('2024-12-30'),
      location: 'Campus-wide',
      capacity: 0,
    },
    
    // Philippine Cultural and Religious Events
    {
      title: 'Simbang Gabi',
      description: 'Traditional Filipino Christmas novena masses',
      eventType: 'OTHER',
      eventDate: new Date('2024-12-16'),
      location: 'Campus Chapel',
      capacity: 200,
    },
    {
      title: 'Flores de Mayo',
      description: 'Traditional Filipino religious festival',
      eventType: 'OTHER',
      eventDate: new Date('2024-05-31'),
      location: 'Campus Chapel',
      capacity: 150,
    },
    {
      title: 'Santacruzan',
      description: 'Traditional Filipino religious procession',
      eventType: 'OTHER',
      eventDate: new Date('2024-05-31'),
      location: 'Campus Grounds',
      capacity: 300,
    },
    
    // Academic and Social Events
    {
      title: 'Intramurals',
      description: 'Annual sports competition between departments',
      eventType: 'SPORTS',
      eventDate: new Date('2024-11-15'),
      location: 'Campus Gymnasium',
      capacity: 500,
    },
    {
      title: 'Science Fair',
      description: 'Student science projects exhibition',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-10-25'),
      location: 'Science Building',
      capacity: 300,
    },
    {
      title: 'Cultural Night',
      description: 'Celebration of Filipino culture and traditions',
      eventType: 'SOCIAL',
      eventDate: new Date('2024-09-15'),
      location: 'Main Auditorium',
      capacity: 400,
    },
    {
      title: 'Career Fair',
      description: 'Job opportunities and career guidance',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-11-20'),
      location: 'Main Auditorium',
      capacity: 600,
    },
    {
      title: 'Christmas Party',
      description: 'Annual Christmas celebration',
      eventType: 'SOCIAL',
      eventDate: new Date('2024-12-15'),
      location: 'Gymnasium',
      capacity: 800,
    },
    {
      title: 'Valentine\'s Day Celebration',
      description: 'Love and friendship celebration',
      eventType: 'SOCIAL',
      eventDate: new Date('2024-02-14'),
      location: 'Student Center',
      capacity: 200,
    },
    {
      title: 'Teacher\'s Day',
      description: 'Recognition and appreciation of teachers',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-10-05'),
      location: 'Main Auditorium',
      capacity: 400,
    },
    {
      title: 'Student Council Elections',
      description: 'Annual student government elections',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-09-10'),
      location: 'Student Center',
      capacity: 300,
    },
    {
      title: 'Alumni Homecoming',
      description: 'Annual alumni reunion and networking',
      eventType: 'SOCIAL',
      eventDate: new Date('2024-12-07'),
      location: 'Main Auditorium',
      capacity: 500,
    },
    {
      title: 'Research Symposium',
      description: 'Student and faculty research presentations',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-11-08'),
      location: 'Conference Hall',
      capacity: 250,
    },
    {
      title: 'Language Festival',
      description: 'Celebration of Filipino and foreign languages',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-08-15'),
      location: 'Language Center',
      capacity: 200,
    },
    {
      title: 'Math Olympiad',
      description: 'Mathematics competition for students',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-10-12'),
      location: 'Math Building',
      capacity: 150,
    },
    {
      title: 'Computer Programming Contest',
      description: 'Annual programming competition',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-09-28'),
      location: 'Computer Lab',
      capacity: 100,
    },
    {
      title: 'Debate Tournament',
      description: 'Inter-department debate competition',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-11-05'),
      location: 'Debate Hall',
      capacity: 200,
    },
    {
      title: 'Art Exhibit',
      description: 'Student artwork exhibition',
      eventType: 'OTHER',
      eventDate: new Date('2024-10-18'),
      location: 'Art Gallery',
      capacity: 150,
    },
    {
      title: 'Music Festival',
      description: 'Student musical performances',
      eventType: 'OTHER',
      eventDate: new Date('2024-09-22'),
      location: 'Music Hall',
      capacity: 300,
    },
    {
      title: 'Dance Competition',
      description: 'Inter-department dance competition',
      eventType: 'SPORTS',
      eventDate: new Date('2024-10-30'),
      location: 'Gymnasium',
      capacity: 400,
    },
    {
      title: 'Book Fair',
      description: 'Educational books and materials exhibition',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-11-12'),
      location: 'Library',
      capacity: 200,
    },
    {
      title: 'Health and Wellness Fair',
      description: 'Health awareness and wellness activities',
      eventType: 'OTHER',
      eventDate: new Date('2024-09-18'),
      location: 'Health Center',
      capacity: 250,
    },
    {
      title: 'Environmental Awareness Day',
      description: 'Environmental protection and sustainability',
      eventType: 'OTHER',
      eventDate: new Date('2024-11-25'),
      location: 'Campus Grounds',
      capacity: 300,
    },
    {
      title: 'Technology Innovation Fair',
      description: 'Student technology projects showcase',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-10-08'),
      location: 'Technology Center',
      capacity: 200,
    },
    {
      title: 'Business Plan Competition',
      description: 'Student entrepreneurship competition',
      eventType: 'ACADEMIC',
      eventDate: new Date('2024-11-15'),
      location: 'Business Center',
      capacity: 150,
    },
    {
      title: 'Film Festival',
      description: 'Student short film screenings',
      eventType: 'OTHER',
      eventDate: new Date('2024-10-22'),
      location: 'Cinema Hall',
      capacity: 200,
    },
    {
      title: 'Poetry Reading Night',
      description: 'Student poetry and literature sharing',
      eventType: 'OTHER',
      eventDate: new Date('2024-09-25'),
      location: 'Literature Center',
      capacity: 100,
    },
    {
      title: 'International Students Day',
      description: 'Celebration of cultural diversity',
      eventType: 'SOCIAL',
      eventDate: new Date('2024-11-17'),
      location: 'International Center',
      capacity: 250,
    },
    {
      title: 'Community Service Day',
      description: 'Volunteer activities and community outreach',
      eventType: 'OTHER',
      eventDate: new Date('2024-12-05'),
      location: 'Various Locations',
      capacity: 300,
    },
  ];

  for (const event of events) {
    await prisma.event.create({
      data: {
        createdBy: adminUsers[0].userId,
        title: event.title,
        description: event.description,
        eventType: event.eventType as EventType,
        eventDate: event.eventDate,
        location: event.location,
        capacity: event.capacity,
        isPublic: true,
        requiresRegistration: false,
        status: EventStatus.SCHEDULED,
        priority: Priority.NORMAL,
      }
    });
  }

  // 18. Create some announcements
  console.log('📢 Creating announcements...');
  
  // Admin-created general announcements
  const adminAnnouncements = [
    {
      title: 'Welcome to Extended Academic Year 2024-2025',
      content: 'Welcome back students! Classes begin on December 1, 2024.',
      isGeneral: true,
    },
    {
      title: 'Midterm Examination Schedule',
      content: 'Midterm examinations will be held from June 15-20, 2025.',
      isGeneral: true,
    },
    {
      title: 'Christmas Break Announcement',
      content: 'Classes will be suspended from December 20, 2024 to January 5, 2025.',
      isGeneral: true,
    },
    {
      title: 'Independence Day Holiday - June 12, 2024',
      content: 'Classes will be suspended on June 12, 2024 in observance of Philippine Independence Day. Regular classes will resume on June 13, 2024.',
      isGeneral: true,
    },
    {
      title: 'Holy Week Break - March 28-31, 2024',
      content: 'Classes will be suspended from March 28-31, 2024 for Holy Week observance. Classes resume on April 1, 2024.',
      isGeneral: true,
    },
    {
      title: 'National Heroes Day - August 26, 2024',
      content: 'Classes will be suspended on August 26, 2024 in observance of National Heroes Day. Regular classes will resume on August 27, 2024.',
      isGeneral: true,
    },
    {
      title: 'Christmas Day Holiday - December 25, 2024',
      content: 'Classes will be suspended on December 25, 2024 in observance of Christmas Day. Regular classes will resume on December 26, 2024.',
      isGeneral: true,
    },
    {
      title: 'Rizal Day Holiday - December 30, 2024',
      content: 'Classes will be suspended on December 30, 2024 in observance of Rizal Day. Regular classes will resume on January 2, 2025.',
      isGeneral: true,
    },
    {
      title: 'Freshman Orientation - August 26, 2024',
      content: 'All new students are required to attend the Freshman Orientation on August 26, 2024 at the Main Auditorium. Attendance is mandatory.',
      isGeneral: true,
    },
    {
      title: 'Intramurals 2024 - November 15, 2024',
      content: 'Annual Intramurals will be held on November 15, 2024 at the Campus Gymnasium. All students are encouraged to participate in various sports events.',
      isGeneral: true,
    },
    {
      title: 'Science Fair 2024 - October 25, 2024',
      content: 'The annual Science Fair will showcase student projects on October 25, 2024 at the Science Building. All students are welcome to attend and support their classmates.',
      isGeneral: true,
    },
    {
      title: 'Cultural Night 2024 - September 15, 2024',
      content: 'Join us for Cultural Night 2024 on September 15, 2024 at the Main Auditorium. Experience Filipino culture through music, dance, and traditional performances.',
      isGeneral: true,
    },
    {
      title: 'Career Fair 2024 - November 20, 2024',
      content: 'The annual Career Fair will be held on November 20, 2024 at the Main Auditorium. Meet potential employers and explore career opportunities.',
      isGeneral: true,
    },
    {
      title: 'Christmas Party 2024 - December 15, 2024',
      content: 'Annual Christmas Party will be held on December 15, 2024 at the Gymnasium. Food, games, and entertainment will be provided. All students and staff are invited.',
      isGeneral: true,
    },
    {
      title: 'Teacher\'s Day Celebration - October 5, 2024',
      content: 'Join us in celebrating Teacher\'s Day on October 5, 2024 at the Main Auditorium. Let\'s show our appreciation to our dedicated teachers.',
      isGeneral: true,
    },
    {
      title: 'Student Council Elections - September 10, 2024',
      content: 'Student Council Elections will be held on September 10, 2024 at the Student Center. All students are encouraged to vote for their representatives.',
      isGeneral: true,
    },
    {
      title: 'Alumni Homecoming 2024 - December 7, 2024',
      content: 'Alumni Homecoming 2024 will be held on December 7, 2024 at the Main Auditorium. Reconnect with fellow alumni and network with professionals.',
      isGeneral: true,
    },
    {
      title: 'Research Symposium 2024 - November 8, 2024',
      content: 'The annual Research Symposium will be held on November 8, 2024 at the Conference Hall. Student and faculty research presentations will be featured.',
      isGeneral: true,
    },
    {
      title: 'Language Festival 2024 - August 15, 2024',
      content: 'Celebrate Filipino and foreign languages at the Language Festival on August 15, 2024 at the Language Center. Cultural performances and language workshops will be featured.',
      isGeneral: true,
    },
    {
      title: 'Math Olympiad 2024 - October 12, 2024',
      content: 'The annual Math Olympiad will be held on October 12, 2024 at the Math Building. All students are welcome to participate in this mathematics competition.',
      isGeneral: true,
    },
    {
      title: 'Computer Programming Contest 2024 - September 28, 2024',
      content: 'The annual Computer Programming Contest will be held on September 28, 2024 at the Computer Lab. Showcase your programming skills and compete with fellow students.',
      isGeneral: true,
    },
    {
      title: 'Debate Tournament 2024 - November 5, 2024',
      content: 'Inter-department Debate Tournament will be held on November 5, 2024 at the Debate Hall. Support your department\'s debate team.',
      isGeneral: true,
    },
    {
      title: 'Art Exhibit 2024 - October 18, 2024',
      content: 'Student Art Exhibit will be held on October 18, 2024 at the Art Gallery. Come and appreciate the creative works of our talented students.',
      isGeneral: true,
    },
    {
      title: 'Music Festival 2024 - September 22, 2024',
      content: 'Student Music Festival will be held on September 22, 2024 at the Music Hall. Enjoy musical performances by our talented students.',
      isGeneral: true,
    },
    {
      title: 'Dance Competition 2024 - October 30, 2024',
      content: 'Inter-department Dance Competition will be held on October 30, 2024 at the Gymnasium. Watch amazing dance performances and support your department.',
      isGeneral: true,
    },
    {
      title: 'Book Fair 2024 - November 12, 2024',
      content: 'Educational Book Fair will be held on November 12, 2024 at the Library. Explore educational books and materials for your studies.',
      isGeneral: true,
    },
    {
      title: 'Health and Wellness Fair 2024 - September 18, 2024',
      content: 'Health and Wellness Fair will be held on September 18, 2024 at the Health Center. Learn about health awareness and participate in wellness activities.',
      isGeneral: true,
    },
    {
      title: 'Environmental Awareness Day 2024 - November 25, 2024',
      content: 'Environmental Awareness Day will be held on November 25, 2024 at the Campus Grounds. Learn about environmental protection and sustainability.',
      isGeneral: true,
    },
    {
      title: 'Technology Innovation Fair 2024 - October 8, 2024',
      content: 'Student Technology Innovation Fair will be held on October 8, 2024 at the Technology Center. Explore innovative technology projects by our students.',
      isGeneral: true,
    },
    {
      title: 'Business Plan Competition 2024 - November 15, 2024',
      content: 'Student Entrepreneurship Competition will be held on November 15, 2024 at the Business Center. Support student entrepreneurs and their innovative business ideas.',
      isGeneral: true,
    },
    {
      title: 'Film Festival 2024 - October 22, 2024',
      content: 'Student Film Festival will be held on October 22, 2024 at the Cinema Hall. Watch short films created by our talented student filmmakers.',
      isGeneral: true,
    },
    {
      title: 'Poetry Reading Night 2024 - September 25, 2024',
      content: 'Student Poetry Reading Night will be held on September 25, 2024 at the Literature Center. Share and appreciate poetry and literature.',
      isGeneral: true,
    },
    {
      title: 'International Students Day 2024 - November 17, 2024',
      content: 'International Students Day will be held on November 17, 2024 at the International Center. Celebrate cultural diversity and international student contributions.',
      isGeneral: true,
    },
    {
      title: 'Community Service Day 2024 - December 5, 2024',
      content: 'Community Service Day will be held on December 5, 2024 at various locations. Participate in volunteer activities and community outreach programs.',
      isGeneral: true,
    },
    {
      title: 'Simbang Gabi 2024 - December 16, 2024',
      content: 'Traditional Filipino Christmas novena masses (Simbang Gabi) will be held on December 16, 2024 at the Campus Chapel. All are welcome to attend.',
      isGeneral: true,
    },
    {
      title: 'Flores de Mayo 2024 - May 31, 2024',
      content: 'Traditional Filipino religious festival Flores de Mayo will be held on May 31, 2024 at the Campus Chapel. Experience Filipino religious traditions.',
      isGeneral: true,
    },
    {
      title: 'Santacruzan 2024 - May 31, 2024',
      content: 'Traditional Filipino religious procession Santacruzan will be held on May 31, 2024 at the Campus Grounds. Witness this beautiful Filipino tradition.',
      isGeneral: true,
    },
    {
      title: 'Valentine\'s Day Celebration 2024 - February 14, 2024',
      content: 'Valentine\'s Day Celebration will be held on February 14, 2024 at the Student Center. Celebrate love and friendship with your fellow students.',
      isGeneral: true,
    },
    {
      title: 'Academic Awards Ceremony 2024 - March 20, 2024',
      content: 'Academic Awards Ceremony will be held on March 20, 2024 at the Main Auditorium. Recognition of outstanding students and their achievements.',
      isGeneral: true,
    },
    {
      title: 'Graduation Ceremony 2024 - April 15, 2024',
      content: 'Annual Graduation Ceremony will be held on April 15, 2024 at the Main Auditorium. Celebrate the achievements of our graduating students.',
      isGeneral: true,
    },
  ];

  for (const announcement of adminAnnouncements) {
    await prisma.announcement.create({
      data: {
        createdby: adminUsers[0].userId,
        userType: Role.ADMIN,
        title: announcement.title,
        content: announcement.content,
        isGeneral: announcement.isGeneral,
        status: Status.ACTIVE,
        priority: Priority.NORMAL,
      }
    });
  }

  // 18.5 Create some sample Emails
  console.log('📧 Creating sample emails...');
  const sampleEmails = [
    {
      subject: 'Welcome to ICCT Smart Attendance System',
      sender: 'admin@icct.edu',
      recipient: 'all-students@icct.edu',
      content: 'Welcome to the new ICCT Smart Attendance System.',
      status: EmailStatus.SENT,
      priority: Priority.NORMAL,
      type: EmailFolder.SENT,
      isRead: true,
      isStarred: false,
      isImportant: true,
      recipients: [
        { address: 'all-students@icct.edu', rtype: EmailRecipientType.TO },
      ],
    },
    {
      subject: 'Attendance Report - Week 1',
      sender: 'system@icct.edu',
      recipient: 'instructors@icct.edu',
      content: 'Weekly attendance report for all classes is now available.',
      status: EmailStatus.DELIVERED,
      priority: Priority.HIGH,
      type: EmailFolder.INBOX,
      isRead: false,
      isStarred: true,
      isImportant: false,
      recipients: [
        { address: 'instructors@icct.edu', rtype: EmailRecipientType.TO },
      ],
    },
    {
      subject: 'RFID Card Activation Required',
      sender: 'it-support@icct.edu',
      recipient: 'new-students@icct.edu',
      content: 'Please activate your RFID card at the IT office before classes begin.',
      status: EmailStatus.READ,
      priority: Priority.URGENT,
      type: EmailFolder.INBOX,
      isRead: true,
      isStarred: false,
      isImportant: true,
      recipients: [
        { address: 'new-students@icct.edu', rtype: EmailRecipientType.TO },
      ],
    },
  ];

  for (const e of sampleEmails) {
    await prisma.email.create({
      data: {
        subject: e.subject,
        sender: e.sender,
        recipient: e.recipient,
        content: e.content,
        status: e.status,
        priority: e.priority,
        type: e.type,
        isRead: e.isRead,
        isStarred: e.isStarred,
        isImportant: e.isImportant,
        recipients: {
          createMany: {
            data: e.recipients,
          },
        },
      },
    });
  }

  // Instructor-created subject-specific announcements
  const instructorAnnouncements = [
    {
      title: 'Programming Fundamentals - Assignment Due',
      content: 'Please submit your programming assignment by Friday. Late submissions will not be accepted.',
      isGeneral: false,
    },
    {
      title: 'Database Management - Lab Schedule Change',
      content: 'Next week\'s lab session will be moved to Wednesday due to system maintenance.',
      isGeneral: false,
    },
    {
      title: 'Web Development - Project Guidelines',
      content: 'Project guidelines and requirements have been posted. Please review before starting your project.',
      isGeneral: false,
    },
    {
      title: 'Software Engineering - Team Formation',
      content: 'Team formation for the final project will begin next week. Please prepare your team proposals.',
      isGeneral: false,
    },
    {
      title: 'Computer Networks - Exam Review',
      content: 'Exam review session will be held on Thursday. Bring your questions!',
      isGeneral: false,
    },
    {
      title: 'Business Ethics - Case Study Discussion',
      content: 'Prepare for tomorrow\'s case study discussion on corporate social responsibility.',
      isGeneral: false,
    },
    {
      title: 'Financial Accounting - Quiz Reminder',
      content: 'Quiz on Chapter 3 will be held next Monday. Study the material thoroughly.',
      isGeneral: false,
    },
    {
      title: 'Engineering Mathematics - Office Hours',
      content: 'Additional office hours available this week for students needing help with calculus.',
      isGeneral: false,
    },
  ];

  // Create instructor announcements linked to their subjects
  for (let i = 0; i < instructorAnnouncements.length; i++) {
    const announcement = instructorAnnouncements[i];
    const subject = subjects[i % subjects.length];
    const instructor = instructors.find(inst => 
      inst.departmentId === subject.departmentId
    ) || instructors[i % instructors.length];
    
    await prisma.announcement.create({
      data: {
        createdby: instructor.instructorId, // instructorId is the same as userId
        userType: Role.INSTRUCTOR,
        title: announcement.title,
        content: announcement.content,
        isGeneral: announcement.isGeneral,
        subjectId: subject.subjectId,
        instructorId: instructor.instructorId,
        status: Status.ACTIVE,
        priority: faker.helpers.arrayElement([Priority.LOW, Priority.NORMAL, Priority.HIGH]),
      }
    });
  }

  // 19. Populate RFIDLogs
  console.log('📋 Populating RFIDLogs...');
  const allTags = await prisma.rFIDTags.findMany();
  const allReaders = await prisma.rFIDReader.findMany();
  for (let i = 0; i < 200; i++) {
    const tag = faker.helpers.arrayElement(allTags);
    const reader = faker.helpers.arrayElement(allReaders);
    if (!tag.studentId) continue; // only student tags are supported
    const studentUserId = (await prisma.student.findUnique({ where: { studentId: tag.studentId } }))?.userId;
    if (!studentUserId) continue;
    await prisma.rFIDLogs.create({
      data: {
        rfidTag: tag.tagNumber,
        readerId: reader.readerId,
        scanType: faker.helpers.arrayElement([ScanType.CHECK_IN, ScanType.CHECK_OUT, ScanType.VERIFICATION]),
        scanStatus: faker.helpers.arrayElement([ScanStatus.SUCCESS, ScanStatus.FAILED, ScanStatus.DUPLICATE]),
        location: String(reader.deviceName ?? 'Unknown Location'),
        timestamp: faker.date.between({ from: currentTrimester.startDate, to: currentTrimester.endDate }),
        userId: studentUserId,
        userRole: Role.STUDENT,
        deviceInfo: { device: reader.deviceName },
        ipAddress: faker.internet.ip(),
      }
    });
  }

  // 20. Populate RFIDReaderLogs
  console.log('📋 Populating RFIDReaderLogs...');
  for (const reader of allReaders) {
    for (let i = 0; i < 5; i++) {
    await prisma.rFIDReaderLogs.create({
      data: {
          readerId: reader.readerId,
          eventType: faker.helpers.arrayElement([RFIDEventType.SCAN_SUCCESS, RFIDEventType.SCAN_ERROR, RFIDEventType.CONNECTION_LOST, RFIDEventType.MAINTENANCE_REQUIRED]),
          severity: faker.helpers.arrayElement([LogSeverity.INFO, LogSeverity.WARNING, LogSeverity.ERROR]),
        message: faker.lorem.sentence(),
          details: { note: faker.lorem.words(3) },
        ipAddress: faker.internet.ip(),
          timestamp: faker.date.between({ from: currentTrimester.startDate, to: currentTrimester.endDate }),
        resolvedAt: faker.datatype.boolean() ? faker.date.recent() : null,
        resolution: faker.lorem.sentence(),
      }
    });
    }
  }

  // 21. Populate ReportLog
  console.log('📋 Populating ReportLog...');
  for (let i = 0; i < 10; i++) {
    await prisma.reportLog.create({
      data: {
        generatedBy: adminUsers[0].userId,
        reportType: faker.helpers.arrayElement([ReportType.ATTENDANCE_SUMMARY, ReportType.USER_ACTIVITY, ReportType.SYSTEM_ACTIVITY]),
        reportName: faker.lorem.words(3),
        description: faker.lorem.sentence(),
        startDate: faker.date.between({ from: currentTrimester.startDate, to: currentTrimester.endDate }),
        endDate: faker.date.between({ from: currentTrimester.startDate, to: currentTrimester.endDate }),
        status: faker.helpers.arrayElement([ReportStatus.PENDING, ReportStatus.COMPLETED, ReportStatus.FAILED]),
        filepath: `/reports/report${i + 1}.pdf`,
        fileSize: faker.number.int({ min: 1000, max: 100000 }),
        fileFormat: 'PDF',
        parameters: { filter: 'all' },
        error: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      }
    });
  }

  // 22. Populate SystemLogs
  console.log('📋 Populating SystemLogs...');
  for (let i = 0; i < 50; i++) {
    await prisma.systemLogs.create({
      data: {
        userId: faker.helpers.arrayElement(adminUsers).userId,
        actionType: faker.helpers.arrayElement(['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE']),
        module: faker.helpers.arrayElement(['USER', 'ATTENDANCE', 'COURSE', 'SYSTEM']),
        entityId: faker.number.int({ min: 1, max: 200 }) || 0,
        details: faker.lorem.sentence(),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        timestamp: faker.date.between({ from: currentTrimester.startDate, to: currentTrimester.endDate }),
      }
    });
  }

  // 23. RFIDTagAssignmentLog already created during RFID tag creation in section 15
  console.log('📋 RFIDTagAssignmentLog entries already created during tag assignment');

  // 24. Populate AttendanceNotification
  console.log('📋 Populating AttendanceNotification...');
  const absences = await prisma.attendance.findMany({ where: { status: AttendanceStatus.ABSENT, NOT: { studentId: null } } });
  for (const absence of absences.slice(0, 30)) { // limit to 30 notifications
    await prisma.attendanceNotification.create({
      data: {
        studentId: absence.studentId!,
        attendanceId: absence.attendanceId,
        type: NotificationType.ABSENCE,
        message: String(`Student was absent on ${(absence.timestamp && absence.timestamp.toDateString()) || 'Unknown date'}`),
        recipient: faker.helpers.arrayElement([RecipientType.PARENT, RecipientType.STUDENT, RecipientType.BOTH]),
        method: NotificationMethod.EMAIL,
        status: faker.helpers.arrayElement([NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.FAILED]),
        sentAt: absence.timestamp && absence.timestamp < new Date() 
          ? faker.date.between({ from: absence.timestamp, to: new Date() })
          : absence.timestamp || new Date(),
        createdAt: absence.timestamp,
      }
    });
  }

  // 25. Create RoleManagement entries for custom roles
  console.log('👥 Creating custom roles...');
  const customRoles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Highest level of system access with all permissions',
      permissions: [
        'View Users', 'Edit Users', 'Delete Users', 'Assign Roles',
        'Manage Super Admins', 'Manage Admin Users', 'User Security Settings',
        'View Attendance', 'Edit Attendance', 'Delete Attendance',
        'Override Attendance', 'Verify Attendance', 'Export Attendance',
        'Manage Courses', 'Manage Departments', 'Manage Subjects',
        'Manage Sections', 'Manage Instructors', 'Manage Students',
        'Manage Rooms', 'Manage Schedules',
        'View Reports', 'Generate Reports', 'Export Data',
        'View Analytics', 'System Analytics',
        'System Settings', 'Database Management', 'Backup & Restore',
        'Security Settings', 'API Management', 'System Monitoring',
        'Audit Logs', 'Emergency Access',
        'Manage RFID Tags', 'Manage RFID Readers',
        'View RFID Logs', 'RFID Configuration',
        'Send Announcements', 'Manage Communications',
        'Email Management', 'Notification Settings',
        'Department Management', 'Department Reports', 'Department Users'
      ],
      status: 'ACTIVE'
    },
    {
      name: 'ADMIN',
      description: 'General administrative tasks and oversight',
      permissions: [
        'View Users', 'Edit Users', 'Delete Users', 'Assign Roles',
        'Manage Admin Users', 'User Security Settings',
        'View Attendance', 'Edit Attendance', 'Delete Attendance',
        'Override Attendance', 'Verify Attendance', 'Export Attendance',
        'Manage Courses', 'Manage Departments', 'Manage Subjects',
        'Manage Sections', 'Manage Instructors', 'Manage Students',
        'Manage Rooms', 'Manage Schedules',
        'View Reports', 'Generate Reports', 'Export Data',
        'View Analytics',
        'System Settings', 'Security Settings', 'System Monitoring',
        'Manage RFID Tags', 'Manage RFID Readers',
        'View RFID Logs', 'RFID Configuration',
        'Send Announcements', 'Manage Communications',
        'Email Management', 'Notification Settings',
        'Department Management', 'Department Reports', 'Department Users'
      ],
      status: 'ACTIVE'
    },
    {
      name: 'DEPARTMENT_HEAD',
      description: 'Manage department-specific operations and users',
      permissions: [
        'View Users', 'Edit Users', 'Assign Roles',
        'Manage Admin Users', 'User Security Settings',
        'View Attendance', 'Edit Attendance', 'Override Attendance',
        'Verify Attendance', 'Export Attendance',
        'Manage Courses', 'Manage Departments', 'Manage Subjects',
        'Manage Instructors', 'Manage Students',
        'View Reports', 'Generate Reports', 'Export Data',
        'Department Management', 'Department Reports', 'Department Users',
        'Send Announcements', 'Manage Communications'
      ],
      status: 'ACTIVE'
    },
    {
      name: 'INSTRUCTOR',
      description: 'Manage classes and attendance',
      permissions: [
        'View Users', 'View Attendance', 'Edit Attendance',
        'View Reports', 'Send Announcements'
      ],
      status: 'ACTIVE'
    },
    {
      name: 'STUDENT',
      description: 'View own attendance and schedule',
      permissions: [
        'View Attendance', 'View Reports'
      ],
      status: 'ACTIVE'
    }
  ];

  for (const role of customRoles) {
    await prisma.roleManagement.create({
      data: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        status: role.status as any,
        totalUsers: 0
      }
    });
  }

  // 26. Seed SecuritySettings if not present
  const existingSecuritySettings = await prisma.securitySettings.findUnique({ where: { id: 1 } });
  if (!existingSecuritySettings) {
    await prisma.securitySettings.create({
      data: {
        id: 1,
        minPasswordLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        passwordExpiryDays: 90,
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 3,
        forceLogoutOnPasswordChange: true,
        twoFactorEnabled: true,
        twoFactorMethod: "APP",
        backupCodesEnabled: true,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
        ipWhitelistEnabled: false,
        ipWhitelist: [],
        auditLoggingEnabled: true,
        loginNotificationsEnabled: true,
        suspiciousActivityAlerts: true,
        sslEnforcement: true,
        apiRateLimiting: true,
        dataEncryptionAtRest: true,
      }
    });
    console.log('🔐 Seeded default SecuritySettings');
  }

  console.log('✅ Database seeding completed successfully!');
  console.log(`📊 Created ${students.length} students with unique names and comprehensive semester attendance`);
  console.log(`👨‍🏫 Created ${instructors.length} instructors across ${departments.length} departments`);
  console.log(`🏷️ Created RFID tags for all students and instructors with assignment logs`);
  console.log(`📚 Created ${subjects.length} subjects with ${subjectSchedules.length} schedules`);
  console.log(`📋 Created ${sections.length} sections across ${allCourseOfferings.length} courses`);
  console.log(`📚 Created ${studentSchedules.length} student enrollments in subject schedules`);
  console.log(`📊 Generated ${attendanceRecords.length} attendance records for focused 3-month semester`);
  console.log(`📅 Semester period: ${semesterStartDate.toLocaleDateString()} to ${semesterEndDate.toLocaleDateString()}`);
  console.log(`🎯 Realistic attendance patterns with weekday/weekend variations`);
  console.log(`👥 Students distributed across multiple courses and departments`);
}

main()
  .catch(e => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });