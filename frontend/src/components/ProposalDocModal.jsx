import { useState, useCallback, useRef, useEffect } from 'react';
import {
    FileText, X, Download, CheckCircle, XCircle, Loader2,
    User, Users, Calendar, BookOpen, GraduationCap, AlertCircle,
    Sparkles, Clock, Shield, Pencil, Save,
    Info, CheckSquare, Layers, HelpCircle
} from 'lucide-react';
import './ProposalDocModal.css';

// ─────────────────────────────────────────────────────────────────────────────
// OFFICIAL NMU TEMPLATE: EXACT TITLES, SUBTITLES & GUIDANCE BOXES (PAGES 01–30)
// Extracted directly from NMU_AI_Robotics_Field_Training_Project_Template.docx
// ─────────────────────────────────────────────────────────────────────────────
const NMU_PAGES = [
    {
        page: '01',
        key: 'cover',
        title: 'Cover Page',
        subtitle: 'Field Training Project Report — AI & Robotics Summer Workshop',
        isCustom: true,
    },
    {
        page: '02',
        key: 'approval',
        title: 'Approval Page',
        subtitle: 'Supervisor and training committee official approval',
        guidance: 'Complete all student and project information before printing. Obtain signatures after final presentation and technical review.',
        isCustom: true,
    },
    {
        page: '03',
        key: 'declaration',
        title: 'Student Declaration',
        subtitle: 'Academic integrity and authorship statement',
        guidance: 'Confirm that the report reflects the team’s own work during field training. List any external libraries, datasets, tutorials, images, or code used. All borrowed ideas, code, and figures must be cited in the References section.',
        ai: false,
        defaultContent: `We declare that this project report is our original work, completed during the New Mansoura University AI & Robotics field training. All external sources, code, datasets, and technical materials have been acknowledged.\n\nStudent signatures: ________________________________________________`,
        hint: 'Academic integrity statement and authorship confirmation.'
    },
    {
        page: '04',
        key: 'acknowledgment',
        title: 'Acknowledgment',
        subtitle: 'Recognize the people and institutions that supported the project',
        guidance: 'Thank the university, faculty, laboratory team, supervisors, and trainers. Mention technical or logistical support that directly contributed to the project. Keep this section professional and concise (approximately 150–250 words).',
        ai: false,
        defaultContent: `We would like to express our sincere appreciation and gratitude to New Mansoura University, the Faculty of Artificial Intelligence & Robotics, our academic supervisors, and our technical trainers at the ERTH Training Center.\n\nTheir continuous mentorship, technical support, and provision of state-of-the-art laboratory robotics hardware, computing resources, and simulation platforms have been invaluable to the successful completion of this field training project.`,
        hint: 'Recognize the university, supervisors, trainers, and institutions supporting the project.'
    },
    {
        page: '05',
        key: 'abstract',
        title: 'Executive Summary / Abstract',
        subtitle: 'A concise overview of the complete project',
        guidance: 'Write 200–300 words after completing the project. Include the problem, objective, robot/platform, methodology, main implementation, key result, and conclusion. Avoid citations, long background discussion, and undefined abbreviations.',
        ai: true,
        defaultContent: `This project presents the design, implementation, and experimental evaluation of an autonomous artificial intelligence and robotics system developed during the NMU Summer Field Training.\n\nThe system addresses practical operational needs through integrated computer vision, edge AI decision pipelines, and real-time robotic actuation. Experimental tests demonstrate high reliability, sub-second latency, and robust task execution in laboratory conditions.`,
        hint: 'Concise 200–300 word summary of problem, methodology, hardware platform, key results, and conclusion.'
    },
    {
        page: '06',
        key: 'toc',
        title: 'Table of Contents',
        subtitle: 'Report structure and page reference map',
        guidance: 'Update page numbers after the report is complete. Check that all headings and page numbers are correct before submission.',
        isCustom: true,
    },
    {
        page: '07',
        key: 'figures_tables',
        title: 'Lists of Figures and Tables',
        subtitle: 'A navigation page for visual material',
        guidance: 'Every figure and table must have a number and descriptive caption. Mention each figure/table in the report text before it appears. Use clear, readable screenshots and diagrams.',
        ai: false,
        defaultContent: `List of Figures:
Figure 1: Overall System Architecture Diagram ............................................ Page 20
Figure 2: AI Perception & Decision Pipeline Flowchart ................................... Page 21
Figure 3: Operational Scenario Sequence & Execution Flow ............................ Page 24

List of Tables:
Table 1: Comparative Analysis of Related Systems ........................................ Page 13
Table 2: Functional & Non-Functional Requirements Specification .................. Page 16
Table 3: Project Risk Assessment & Mitigation Register .................................. Page 17
Table 4: Hardware & Software Test Cases and Verification Results ................ Page 25`,
        hint: 'Numbered list of all figures and tables with descriptive titles and page numbers.'
    },
    {
        page: '08',
        key: 'abbreviations',
        title: 'Abbreviations and Technical Terms',
        subtitle: 'Define terms used throughout the report',
        guidance: 'Include only abbreviations that appear in the report. Write the full term the first time it appears in the main text. Add robot-specific and software-specific terms used by your project.',
        ai: true,
        defaultContent: `AI   — Artificial Intelligence
CV   — Computer Vision
HRI  — Human–Robot Interaction
ROS  — Robot Operating System
SLAM — Simultaneous Localization and Mapping
API  — Application Programming Interface
IMU  — Inertial Measurement Unit
LiDAR — Light Detection and Ranging
CNN  — Convolutional Neural Network
SDK  — Software Development Kit`,
        hint: 'Glossary of all technical abbreviations, acronyms, and robotics terms used in the document.'
    },
    {
        page: '09',
        key: 'introduction_background',
        title: 'Chapter 1 — Introduction',
        subtitle: '1.1 Field Training Context and Technology Area',
        guidance: 'Describe the AI & Robotics field training and the selected application area. Explain why the topic is relevant to education, industry, healthcare, museums, smart cities, or society. Introduce the robot/platform used without giving detailed implementation yet.',
        ai: true,
        defaultContent: `Field training in Artificial Intelligence & Robotics at New Mansoura University provides hands-on engineering experience in solving practical automation and intelligence challenges.\n\nThis project focuses on deploying modern AI algorithms on physical robotic hardware to bridge the gap between theoretical algorithms and real-world execution. The application area is tailored to enhance efficiency, human-robot collaboration, and autonomous task execution.`,
        hint: 'Describe the field training context, technology area, practical relevance, and introduction to the platform.'
    },
    {
        page: '10',
        key: 'technical_background',
        title: '1.2 Technical Background',
        subtitle: 'Theoretical and technical foundations',
        guidance: 'Explain the basic concepts required to understand the project. Describe the role of sensors, actuators, controller, software, and AI in the system. Use simple diagrams where helpful and cite any external technical information.',
        ai: true,
        defaultContent: `Understanding the project requires familiarity with key concepts in sensory perception, neural network inference, and closed-loop motor control.\n\nSensors (RGB cameras, IMUs, touch sensors) provide environmental data; the on-board controller processes streams through optimized neural inference models; and motor controllers translate decisions into synchronized actuator movements with sensory feedback.`,
        hint: 'Explain technical concepts: sensors, actuators, controller, software stack, and AI role.'
    },
    {
        page: '11',
        key: 'objectives_scope',
        title: '1.3 Aim, Objectives and Scope',
        subtitle: 'What the Project Will Achieve',
        guidance: 'Write one clear overall aim. Provide 4–7 measurable objectives beginning with action verbs such as design, implement, test, evaluate, or integrate. State what is included and excluded from the project scope.',
        ai: true,
        defaultContent: `Project Aim:\nTo design, implement, and validate an intelligent robotic system capable of autonomous perception, decision-making, and physical task execution in laboratory conditions.\n\nSpecific Objectives:\n1. Design the hardware and software architecture for real-time sensor processing.\n2. Implement and optimize AI vision/audio algorithms for edge computing.\n3. Integrate robot motion routines with the AI decision pipeline.\n4. Conduct rigorous unit and system-level test cases to evaluate performance.\n\nScope Boundaries:\n• In-Scope: Laboratory environment testing, real-time edge processing, autonomous behavior execution.\n• Out-of-Scope: Harsh outdoor conditions, multi-robot swarm coordination, cloud-reliant latency pipelines.`,
        hint: 'State overall aim, 4–7 measurable objectives with action verbs, and scope boundaries.'
    },
    {
        page: '12',
        key: 'related_work',
        title: 'Chapter 2 — Related Work',
        subtitle: '2.1 Existing Systems and Similar Projects',
        guidance: 'Review at least three relevant systems, research projects, products, or educational demonstrations. For each work, explain the platform, method, main capability, and limitation. Do not copy product descriptions; summarize and cite the source.',
        ai: true,
        defaultContent: `Existing research in robotics and AI has explored various automated systems for education, service, and inspection:\n\n1. Traditional Rule-Based Robotics: Relies on hardcoded state machines; offers high repeatability but struggles in dynamic environments without AI adaptation.\n2. Cloud-Based AI Robotics: Offloads heavy computation to remote servers; provides powerful models but introduces network dependency and unpredictable latency.\n3. Embedded Edge AI Solutions: Executes lightweight quantized models locally on the robot controller, achieving low latency and independent operation, which forms the foundation of our approach.`,
        hint: 'Review at least three related systems/papers: platform, method, capability, limitation, and citation.'
    },
    {
        page: '13',
        key: 'comparative_analysis',
        title: '2.2 Comparative Analysis Table',
        subtitle: 'Comparison of Related Systems',
        guidance: 'Compare existing work using common criteria such as robot type, sensors, AI function, programming environment, cost, accuracy, or application. Explain what your project adopts, improves, simplifies, or changes. Use the comparison to justify the proposed project.',
        ai: false,
        defaultContent: `System / Project           | Platform          | Main Feature               | Limitation               | Reference
---------------------------|-------------------|----------------------------|--------------------------|------------------
Cloud-Vision Assistant     | NAO Humanoid      | Cloud Speech & Vision API  | High latency (>1.5s)     | IEEE Paper [1]
Rule-Based Patrol Robot    | LIMO Mobile Robot | Pre-mapped Waypoint Nav    | No dynamic perception    | Conf. Proc. [2]
Voice-Controlled Arm       | 6-DOF Robotic Arm | Basic Voice Keyword Match  | Fixed command dictionary | Tech Manual [3]
Proposed NMU Project       | Integrated Lab AI | Real-Time On-Device AI     | Lab-calibrated lighting  | Current Work`,
        hint: 'Structured comparison of existing work vs proposed solution across key engineering criteria.'
    },
    {
        page: '14',
        key: 'design_gap',
        title: '2.3 Research / Design Gap',
        subtitle: 'Identified Gap and Project Contribution',
        guidance: 'Identify the unmet need or limitation found in related work. Explain why the gap matters for the selected users or environment. State the expected contribution of the student project in 2–4 precise points.',
        ai: true,
        defaultContent: `Identified Design Gap:\nMost existing educational and prototype robotics systems either depend heavily on external cloud servers (causing delay and vulnerability to network loss) or lack intelligent real-time adaptation to changing visual stimuli.\n\nExpected Project Contributions:\n1. Development of a self-contained on-device perception and actuation pipeline.\n2. Sub-100ms response time between sensory input and physical robotic reaction.\n3. Modular software architecture easily extendable for future field training cohorts.`,
        hint: 'Highlight unmet needs in prior work and state 2–4 precise project contributions.'
    },
    {
        page: '15',
        key: 'problem_definition',
        title: 'Chapter 3 — Problem Definition',
        subtitle: '3.1 Problem Statement',
        guidance: 'Describe the current situation, affected users, and main difficulty. State causes, constraints, and consequences. Write the problem as an engineering challenge, not only as a general topic.',
        ai: true,
        defaultContent: `Problem Statement:\nHuman-robot interaction and automated service tasks require continuous visual and sensory feedback to operate safely and effectively. In field training and industrial settings, robotic platforms must perform perceptual recognition and physical tasks without human teleoperation.\n\nThe engineering challenge is to balance computational throughput on constrained embedded hardware while maintaining high accuracy and safe physical interaction.`,
        hint: 'Describe problem statement, affected users, causes, constraints, and engineering challenges.'
    },
    {
        page: '16',
        key: 'requirements',
        title: '3.2 Users and Requirements',
        subtitle: 'Stakeholders, Use Cases and Requirements',
        guidance: 'Identify primary users, secondary users, supervisor/operator, and environment. Write functional requirements: what the system must do. Write non-functional requirements: safety, reliability, speed, usability, privacy, maintainability, or cost.',
        ai: false,
        defaultContent: `Stakeholders: Primary Trainees, Lab Supervisors, Academic Evaluators, Future Researchers.

ID     | Type            | Requirement Specification                                              | Priority
-------|-----------------|------------------------------------------------------------------------|---------
FR-01  | Functional      | The system shall initialize all connected sensors upon startup         | High
FR-02  | Functional      | The AI pipeline shall classify targets with at least 85% accuracy     | High
FR-03  | Functional      | The robot controller shall execute motion commands within 200ms       | High
FR-04  | Functional      | The system shall log execution data and error states to disk           | Medium
NFR-01 | Non-Functional  | The total perception-to-action cycle latency shall remain under 300ms   | High
NFR-02 | Non-Functional  | The platform shall operate continuously on battery for at least 30 min | Medium
NFR-03 | Non-Functional  | Emergency stop mechanisms shall trigger on sensor obstruction          | High`,
        hint: 'List primary users and specify functional (FR) and non-functional (NFR) engineering requirements.'
    },
    {
        page: '17',
        key: 'project_plan',
        title: '3.3 Project Plan and Success Criteria',
        subtitle: 'Tasks, Timeline, Risks and Evaluation Metrics',
        guidance: 'Break the project into training and development tasks. Define measurable success criteria such as detection accuracy, task completion, response time, navigation success, or repeatability. Identify key technical risks and mitigation actions.',
        ai: false,
        defaultContent: `Project Development Schedule:
• Week 1: Platform diagnostics, sensor calibration, problem definition, and requirement specification.
• Week 2: AI model selection, dataset preparation, offline training, and edge quantization.
• Week 3: Software-hardware integration, motion control routines, and behavior loop programming.
• Week 4: System verification, test case execution, documentation finalization, and presentation.

Risk Register:
Risk Description                   | Likelihood | Impact | Mitigation Action
-----------------------------------|------------|--------|----------------------------------------------------
Embedded processor thermal limit   | Medium     | High   | Implement model quantization and frame throttling
Sensor communication drop / timeout| Low        | High   | Add heartbeat watchdog and auto-reconnect routine
Ambient lighting variability       | High       | Medium | Apply adaptive histogram equalization in CV pipeline`,
        hint: 'Breakdown of tasks, timeline milestones, success metrics, and risk mitigation register.'
    },
    {
        page: '18',
        key: 'methodology',
        title: 'Chapter 4 — Methodology',
        subtitle: '4.1 Development Approach',
        guidance: 'Explain the steps followed from problem analysis to final testing. Describe how the team divided tasks, reviewed progress, and made design decisions. Include a flowchart showing the complete project methodology.',
        ai: true,
        defaultContent: `The development follows an iterative engineering methodology comprising four major phases:\n\n1. Requirement Analysis & Platform Selection: Defining hardware constraints and interface protocols.\n2. Modular Pipeline Development: Developing perception, decision-making, and actuation as isolated modules.\n3. Hardware-in-the-Loop Integration: Connecting software routines to physical actuators with sensor feedback.\n4. Experimental Validation: Running systematic test suites to measure accuracy, latency, and repeatability.`,
        hint: 'Describe development methodology, task division, iterative reviews, and process flowchart.'
    },
    {
        page: '19',
        key: 'platform_description',
        title: '4.2 Robot / Platform Description',
        subtitle: 'Selected Laboratory Equipment',
        guidance: 'Identify the selected platform: Yanshee, NAO, Robot Arm, AI Box, LIMO, Computer Vision Kit, or another lab system. Describe the relevant hardware: cameras, microphones, motors, joints, LiDAR, IMU, gripper, controller, and connectivity. Explain why this platform is suitable for the project.',
        ai: true,
        defaultContent: `The project utilizes the designated NMU laboratory equipment (Yanshee / NAO / Robot Arm / AI Box / LIMO platform).\n\nKey Hardware Specifications:\n• Processing Unit: Multi-core embedded ARM processor running Linux / ROS.\n• Sensory Array: High-definition RGB camera, 6-axis IMU, multi-microphone array, ultrasonic sensors.\n• Actuation: High-torque digital bus servos with position and temperature feedback.\n• Connectivity: High-speed Wi-Fi, Bluetooth, and local UART/USB bus communication.`,
        hint: 'Detail the hardware platform, processors, sensors, motors, joints, and justify the selection.'
    },
    {
        page: '20',
        key: 'expected_system_design',
        title: '4.3 System Architecture',
        subtitle: 'Hardware and Software Architecture',
        guidance: 'Draw a block diagram showing inputs, processing, decision-making, and outputs. List software tools, programming languages, libraries, APIs, operating systems, and communication methods. Explain how the components exchange data.',
        ai: true,
        defaultContent: `The system architecture is structured into three interconnected layers:\n\n1. Perception Layer: Interfaces directly with camera and sensor hardware; applies normalization and noise filtering.\n2. Decision & AI Layer: Runs deep neural inference for classification/detection; formats action intents.\n3. Actuation & Control Layer: Maps intents to joint trajectories, inverse kinematics, and voice responses.\n\nCommunication between layers utilizes modular message queues (ROS nodes / Python asynchronous queues).`,
        hint: 'Block diagram description showing inputs, processing units, decision flow, and hardware outputs.'
    },
    {
        page: '21',
        key: 'algorithm_workflow',
        title: '4.4 Algorithm and Workflow',
        subtitle: 'System Logic and AI / Robotics Pipeline',
        guidance: 'Present the project flow from startup to task completion. Describe sensing, preprocessing, AI inference or rule-based decision, robot action, and feedback. Add pseudocode or a flowchart for the main algorithm.',
        ai: true,
        defaultContent: `Execution Workflow:\n\nStep 1: System Boot & Self-Test -> Initialize camera, test servos, calibrate home positions.\nStep 2: Continuous Perception Loop -> Capture frame (30 FPS), resize, run neural inference.\nStep 3: State Decision Logic -> Match detection outputs against task objectives.\nStep 4: Actuation Command -> Dispatch angle/velocity setpoints to servo controllers.\nStep 5: Feedback & Error Checking -> Readback joint encoders; log status; repeat.`,
        hint: 'Detailed pipeline logic from startup to completion, pseudocode, and decision branches.'
    },
    {
        page: '22',
        key: 'implementation',
        title: 'Chapter 5 — Implementation',
        subtitle: '5.1 Setup and Integration Steps',
        guidance: 'Document the implementation in chronological steps. Include hardware setup, network connection, software installation, calibration, and testing of individual components. Use numbered steps and clear screenshots; hide passwords and private network information.',
        ai: false,
        defaultContent: `Step-by-Step Implementation Record:\n\n1. Environment Setup: Flashed firmware, configured Ubuntu/ROS environment, installed OpenCV, PyTorch/ONNX Runtime.\n2. Sensor Calibration: Adjusted camera intrinsic matrix and calibrated IMU zero-rate level.\n3. AI Model Deployment: Converted pre-trained model to lightweight edge format with INT8 quantization.\n4. Behavior Scripting: Implemented motion trajectories and safety boundary checks.\n5. System Integration: Bound perception listener with actuation loop in a multithreaded architecture.`,
        hint: 'Chronological setup: hardware wiring, software packages, network config, and calibration steps.'
    },
    {
        page: '23',
        key: 'programming',
        title: '5.2 Programming and Configuration',
        subtitle: 'Code Structure and Key Functions',
        guidance: 'Explain the main files, modules, functions, robot behaviors, or block-programming sequences. Include only important code excerpts and explain each excerpt. Place full code in the appendix or repository, not in the main chapter.',
        ai: false,
        defaultContent: `Source Code Organization:\n\n• /src/main.py — Application entry point, thread coordinator, and lifecycle manager.\n• /src/vision_detector.py — Camera capture worker, frame preprocessor, and ONNX inference engine.\n• /src/motion_controller.py — Servo communication wrapper, trajectory generator, and safety limiter.\n• /config/params.yaml — Hardware ports, confidence thresholds, and PID gain parameters.`,
        hint: 'Explain main modules, functions, algorithms, and key code excerpts.'
    },
    {
        page: '24',
        key: 'application_scenario',
        title: '5.3 Application Scenario',
        subtitle: 'Complete System Operation',
        guidance: 'Describe one complete real-world or competition scenario. Explain the initial state, user input, robot perception, decision, action, and final output. Add a sequence diagram, storyboard, or annotated photographs.',
        ai: false,
        defaultContent: `End-to-End Demonstration Scenario:\n\n1. Initial State: The robot stands in standby mode, scanning the interaction zone.\n2. Detection: A target object/user is detected within camera field of view (confidence > 0.88).\n3. Decision: The controller determines the appropriate interactive gesture and path trajectory.\n4. Execution: The robot smoothly turns toward the target, performs the task, and provides audio feedback.\n5. Completion: Task verified through sensor feedback; robot transitions back to standby.`,
        hint: 'Describe one complete real-world operational scenario from initial state to final output.'
    },
    {
        page: '25',
        key: 'test_plan',
        title: 'Chapter 6 — Testing',
        subtitle: '6.1 Test Plan and Test Cases',
        guidance: 'Test components individually before testing the full system. For every test, record purpose, input/condition, expected result, actual result, and status. Include normal cases, edge cases, and failure conditions.',
        ai: false,
        defaultContent: `Test Suite Execution Matrix:

Test ID | Test Case Name          | Input Condition             | Expected Outcome            | Observed Result | Status
--------|-------------------------|-----------------------------|-----------------------------|-----------------|-------
TC-01   | Power & Driver Boot     | Cold boot from battery      | All servos respond to ping  | 100% online     | PASS
TC-02   | AI Object Recognition   | Target at 1.0m distance      | Detected with conf > 85%    | Conf = 92.4%    | PASS
TC-03   | Low-Light Perception    | Ambient light at 50 lux     | Model maintains detection   | Conf = 81.2%    | PASS
TC-04   | Motion Actuation Time   | Full trajectory dispatch    | Movement completes < 1.5s   | Time = 1.18s    | PASS
TC-05   | Emergency Obstruction   | Physical obstacle in path   | Immediate servo soft-halt   | Halt in 48ms    | PASS`,
        hint: 'Systematic test table: Test ID, condition, expected result, actual result, and PASS/FAIL status.'
    },
    {
        page: '26',
        key: 'results',
        title: '6.2 Results and Evaluation',
        subtitle: 'Measurements and Observed Performance',
        guidance: 'Present quantitative and qualitative results. Use tables, charts, images, or videos as evidence. Compare results with the success criteria defined earlier and explain any deviations.',
        ai: false,
        defaultContent: `Quantitative Experimental Findings:\n\n• Perception Accuracy: 92.4% average across 50 validation trials.\n• Neural Inference Speed: 38.5 ms per frame on embedded processor.\n• End-to-End Reaction Time: 185 ms from optical photon capture to motor motion start.\n• Repeatability: 96% successful task completion rate in repeated benchmark cycles.\n\nQualitative Observations: The robot exhibited natural, stable movements without noticeable jitter.`,
        hint: 'Present quantitative measurements, charts, accuracy metrics, and benchmark comparisons.'
    },
    {
        page: '27',
        key: 'discussion',
        title: '6.3 Discussion and Limitations',
        subtitle: 'Interpretation of Results',
        guidance: 'Explain what worked well and why. Discuss technical limitations such as lighting, noise, battery, Wi-Fi, processing delay, mechanical reach, sensor range, or dataset limitations. Describe corrective changes made during development.',
        ai: false,
        defaultContent: `Result Interpretation:\nThe experimental results confirm that lightweight edge AI models can provide sufficient accuracy for autonomous robotics without requiring cloud connectivity.\n\nObserved Limitations:\n1. Extreme Lighting: Accuracy degrades under direct harsh glare or deep shadows.\n2. Thermal Throttling: Sustained 100% CPU/GPU usage leads to throttling after 25 minutes of continuous inference.\n3. Motion Dynamics: High-speed movements introduce slight inertial overshoot requiring PID dampening.`,
        hint: 'Discuss what worked well, technical limitations, environmental factors, and lessons learned.'
    },
    {
        page: '28',
        key: 'conclusion',
        title: 'Chapter 7 — Conclusion and Future Work',
        subtitle: 'Summary, Learning Outcomes and Next Steps',
        guidance: 'Summarize the problem, system, method, and main result without adding new information. Describe technical and teamwork skills gained during field training. Recommend realistic future improvements or additional features.',
        ai: false,
        defaultContent: `Summary of Accomplishments:\nDuring this NMU field training program, our team successfully engineered an autonomous AI-driven robotic system from concept to physical validation. All primary functional requirements and latency targets were achieved.\n\nSkills Acquired:\n• Practical embedded Linux and ROS software development.\n• Computer vision dataset curation and edge neural network quantization.\n• Hardware troubleshooting, sensor integration, and teamwork in an engineering laboratory.\n\nFuture Extensions:\n• Integrate multi-modal depth sensors (RGB-D / LiDAR) for enhanced 3D spatial mapping.\n• Implement reinforcement learning for adaptive trajectory optimization.`,
        hint: 'Summarize achievements, teamwork skills gained, and recommend realistic future extensions.'
    },
    {
        page: '29',
        key: 'references',
        title: 'References',
        subtitle: 'Use one consistent academic citation style',
        guidance: 'Include every source cited in the report: books, papers, official manuals, websites, datasets, and software documentation. Prefer official robot documentation and primary technical sources. Include author/organization, title, year, publisher/site, URL if applicable, and access date for online material.',
        ai: false,
        defaultContent: `[1] New Mansoura University, Faculty of Artificial Intelligence & Robotics, "Field Training Course Guidelines & Project Specifications," NMU Academic Press, 2026.
[2] R. Siegwart, I. R. Nourbakhsh, and D. Scaramuzza, "Introduction to Autonomous Mobile Robots," 2nd ed., MIT Press, Cambridge, MA, 2011.
[3] G. Bradski and A. Kaehler, "Learning OpenCV: Computer Vision with the OpenCV Library," O'Reilly Media, 2008.
[4] Robot Platform SDK Reference Manual and Hardware API Documentation, 2025.
[5] ONNX Runtime Documentation: High Performance Deep Learning Inference on Embedded Devices, 2025.`,
        hint: 'Academic reference citations in standard IEEE or APA format.'
    },
    {
        page: '30',
        key: 'appendices',
        title: 'Appendices',
        subtitle: 'Supporting Evidence and Project Records',
        guidance: 'Appendix A: Full source code or repository information.\nAppendix B: Datasheets, wiring, calibration settings, robot configuration, or API commands.\nAppendix C: Weekly training log, attendance evidence, photographs, additional test results, and team contribution table.',
        ai: false,
        defaultContent: `Appendix A: Source Code & Repository\n• GitHub Repository: https://github.com/nmu-erth-training-center/project-submission\n• Build Instructions: See README.md for Docker setup and dependency installation.\n\nAppendix B: Hardware Wiring & Pinout Reference\n• I2C Bus: SDA -> Pin 3, SCL -> Pin 5\n• UART Serial: TX -> Pin 8, RX -> Pin 10 (Baudrate 115200)\n• Camera: CSI Ribbon Cable Interface 0\n\nAppendix C: Field Training Weekly Logs & Attendance Record\n• Weekly training log verified and signed by academic supervisor.`,
        hint: 'Supporting code repositories, wiring schematics, calibration datasheets, and weekly training logs.'
    }
];

const CATEGORY_LABEL = {
    software:   'Software / AI',
    yanshee:    'Yanshee Robots',
    nao:        'NAO Robots',
    integrated: 'Integrated Systems',
};

// ─────────────────────────────────────────────────────────────────────────────
// PageCard — Renders an individual A4 academic page sheet (NMU template style)
// ─────────────────────────────────────────────────────────────────────────────
function PageCard({ pageDef, savedContent, source, onSave, ideaId, readOnly, isLoading }) {
    const [editing, setEditing]     = useState(false);
    const [draft, setDraft]         = useState('');
    const [saving, setSaving]       = useState(false);
    const [saveOk, setSaveOk]       = useState(false);
    const [saveErr, setSaveErr]     = useState('');
    const [showGuide, setShowGuide] = useState(false);
    const [revealed, setRevealed]   = useState(!isLoading);

    // Trigger reveal animation when loading finishes (regardless of content)
    useEffect(() => {
        if (!isLoading) {
            const t = setTimeout(() => setRevealed(true), 80);
            return () => clearTimeout(t);
        }
    }, [isLoading]);

    const displayContent  = savedContent || '';
    const isAI            = source === 'ai_generated';
    const isTraineeSaved  = source === 'trainee_edit';
    const needsFill       = pageDef.traineeEdit && !isTraineeSaved && !isAI;

    const badgeClass = isTraineeSaved ? 'pdm-badge-saved'
        : isAI ? 'pdm-badge-ai'
        : needsFill ? 'pdm-badge-fill'
        : 'pdm-badge-default';
    const badgeText  = isTraineeSaved ? '✓ Saved'
        : isAI ? '✦ AI Generated'
        : needsFill ? '✎ Fill Required'
        : '📄 Template';

    const startEdit = () => { setDraft(displayContent); setEditing(true); setSaveOk(false); setSaveErr(''); };

    const handleSave = async () => {
        setSaving(true); setSaveErr('');
        try {
            const res  = await fetch('/api/training/ideas/proposal_save.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea_id: ideaId, section_key: pageDef.key, content: draft, section_title: pageDef.title }),
            });
            const data = await res.json();
            if (res.ok && data.success) { setSaveOk(true); setEditing(false); if (onSave) onSave(pageDef.key, draft); }
            else { setSaveErr(data.error || 'Save failed'); }
        } catch { setSaveErr('Network error — please retry'); }
        finally { setSaving(false); }
    };

    if (isLoading) {
        return (
            <div id={`pdm-sec-${pageDef.key}`} className="pdm-page-card pdm-page-shimmer">
                <div className="pdm-page-topbar">
                    <div className="pdm-page-topbar-left">
                        <div className="pdm-nmu-emblem">NMU</div>
                        <div className="pdm-page-topbar-text">
                            <div className="pdm-page-topbar-uni">New Mansoura University — Faculty of AI &amp; Robotics</div>
                            <div className="pdm-page-topbar-sub">ERTH Field Training Center · Summer Workshop</div>
                        </div>
                    </div>
                    <div className="pdm-page-topbar-right">
                        <div className="pdm-page-num-badge">PAGE {pageDef.page} / 30</div>
                    </div>
                </div>
                <div className="pdm-gold-rule" />
                <div className="pdm-shimmer-title-row">
                    <div className="pdm-shimmer-bar pdm-shimmer-bar-title" />
                    <div className="pdm-shimmer-bar pdm-shimmer-bar-sub" />
                </div>
                <div className="pdm-shimmer-body">
                    <div className="pdm-shimmer-bar" style={{width:'95%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'88%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'91%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'78%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'93%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'85%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'72%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'90%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'65%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'88%'}} />
                    <div className="pdm-shimmer-bar" style={{width:'80%'}} />
                </div>
                <div className="pdm-shimmer-ai-label">
                    <Sparkles size={13} />
                    <span>Groq AI is writing this page...</span>
                </div>
                <div className="pdm-page-footer">
                    <span>New Mansoura University — AI &amp; Robotics Field Training Report</span>
                    <span>Page {pageDef.page} of 30</span>
                </div>
            </div>
        );
    }

    return (
        <div
            id={`pdm-sec-${pageDef.key}`}
            className={`pdm-page-card ${revealed ? 'pdm-page-revealed' : 'pdm-page-revealing'}`}
        >

            {/* NMU-style dark teal top bar */}
            <div className="pdm-page-topbar">
                <div className="pdm-page-topbar-left">
                    <div className="pdm-nmu-emblem">NMU</div>
                    <div className="pdm-page-topbar-text">
                        <div className="pdm-page-topbar-uni">New Mansoura University — Faculty of AI &amp; Robotics</div>
                        <div className="pdm-page-topbar-sub">ERTH Field Training Center · Summer Workshop</div>
                    </div>
                </div>
                <div className="pdm-page-topbar-right">
                    <div className="pdm-page-num-badge">PAGE {pageDef.page} / 30</div>
                </div>
            </div>

            {/* Gold rule separator */}
            <div className="pdm-gold-rule" />

            {/* Title row with actions */}
            <div className="pdm-title-row">
                <div className="pdm-title-block">
                    <h2 className="pdm-chapter-heading">{pageDef.title}</h2>
                    {pageDef.subtitle && <div className="pdm-section-subtitle">{pageDef.subtitle}</div>}
                </div>
                <div className="pdm-title-actions no-print">
                    <span className={`pdm-section-badge ${badgeClass}`}>{badgeText}</span>
                    {pageDef.guidance && (
                        <button type="button" className={`pdm-btn-guide ${showGuide ? 'active' : ''}`} onClick={() => setShowGuide(!showGuide)} title="Toggle guidance">
                            <HelpCircle size={12} /><span>Guide</span>
                        </button>
                    )}
                    {!readOnly && !editing && (
                        <button type="button" className="pdm-edit-btn" onClick={startEdit} title="Edit this page">
                            <Pencil size={12} /><span>Edit Page</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Official Guidance Box */}
            {pageDef.guidance && (showGuide || editing) && (
                <div className="pdm-guidance-box no-print">
                    <div className="pdm-guidance-header"><Info size={13} /><strong>What to include on this page:</strong></div>
                    <p className="pdm-guidance-text">{pageDef.guidance}</p>
                </div>
            )}

            {/* Page Body / Editor */}
            {editing ? (
                <div className="pdm-edit-area no-print">
                    <textarea className="pdm-edit-textarea" value={draft} onChange={e => setDraft(e.target.value)}
                        rows={Math.max(12, draft.split('\n').length + 2)} autoFocus />
                    {saveErr && <div className="pdm-save-err"><AlertCircle size={13} /> {saveErr}</div>}
                    <div className="pdm-edit-actions">
                        <button type="button" className="pdm-btn pdm-btn-approve" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                        <button type="button" className="pdm-btn pdm-btn-ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="pdm-page-body nmu-body-text">
                    {saveOk && <div className="pdm-save-confirm no-print"><CheckSquare size={13} /> Changes saved to project database</div>}
                    {displayContent.split('\n').map((line, i) => {
                        if (!line.trim()) return <div key={i} className="pdm-line-spacer" />;
                        if (line.includes('|') && line.trim().split('|').length > 2)
                            return <div key={i} className="pdm-table-line">{line}</div>;
                        if (line === line.toUpperCase() && line.trim().length > 5 && !line.includes('•') && /^[A-Z\s\d&.,–—-]+$/.test(line.trim()))
                            return <div key={i} className="pdm-section-head">{line}</div>;
                        return <p key={i} className="pdm-nmu-para">{line}</p>;
                    })}
                </div>
            )}

            {/* Page Footer */}
            <div className="pdm-page-footer">
                <span>New Mansoura University — AI &amp; Robotics Field Training Report</span>
                <span>Page {pageDef.page} of 30</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ProposalDocModal({
    proposal: initialProposal,
    ideaId,
    isEvaluator = false,
    onClose,
    onEvaluated,
    lang = 'en',
}) {
    const [proposal, setProposal]           = useState(initialProposal);
    const [evaluating, setEvaluating]       = useState(false);
    const [feedback, setFeedback]           = useState('');
    const [evalError, setEvalError]         = useState('');
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [aiFilling, setAiFilling]         = useState(false);
    const [aiFillMsg, setAiFillMsg]         = useState('');
    const [editingApproval, setEditingApproval] = useState(false);
    const [draftApproval, setDraftApproval]     = useState({ trainer: '', academic_supervisor: '', program_coordinator: '', department_head: '' });
    const [savingApproval, setSavingApproval]   = useState(false);
    const [saveApprovalOk, setSaveApprovalOk]   = useState(false);
    const [saveApprovalErr, setSaveApprovalErr] = useState('');
    // loadingKeys = set of section keys currently being filled (shimmer shown)
    const [loadingKeys, setLoadingKeys]     = useState(new Set());
    const bodyRef = useRef(null);
    const autoFillTriggered = useRef(false);

    if (!proposal) return null;

    const rawSections = proposal.sections || [];
    const team        = proposal.team || {};
    const title       = proposal.project_title || proposal.title || 'Training Project';
    const category    = proposal.category || 'software';
    const catLabel    = CATEGORY_LABEL[category] || category;

    const sectionMap = {};
    rawSections.forEach(s => { sectionMap[s.key] = { content: s.content || '', source: s.source || '' }; });

    // Save Page 02 Approval Committee Names
    const handleSaveApproval = async () => {
        setSavingApproval(true);
        setSaveApprovalErr('');
        try {
            const res = await fetch('/api/training/ideas/proposal_save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: ideaId,
                    section_key: 'approval',
                    content: JSON.stringify(draftApproval),
                    section_title: 'Approval Page'
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setProposal(prev => ({
                    ...prev,
                    team: {
                        ...(prev.team || {}),
                        ...draftApproval
                    }
                }));
                setSaveApprovalOk(true);
                setEditingApproval(false);
            } else {
                setSaveApprovalErr(data.error || 'Failed to save committee names');
            }
        } catch {
            setSaveApprovalErr('Network error saving committee names');
        } finally {
            setSavingApproval(false);
        }
    };

    // Check if AI content is present (any section with ai_generated source)
    const hasAIContent = rawSections.some(s => s.source === 'ai_generated' && s.content);

    // ── Core AI fill function ────────────────────────────────────────────────
    const triggerAiFill = useCallback(async (showConfirm = false) => {
        if (showConfirm) {
            const ok = window.confirm(
                lang === 'ar'
                    ? 'هل تريد إعادة توليد المحتوى بالذكاء الاصطناعي Groq؟'
                    : 'Regenerate all pages with Groq AI?'
            );
            if (!ok) return;
        }

        // Mark ALL 27 fillable section keys as loading (shimmer)
        const fillableKeys = NMU_PAGES
            .filter(p => !['cover', 'approval', 'toc'].includes(p.key))
            .map(p => p.key);
        setLoadingKeys(new Set(fillableKeys));
        setAiFilling(true);
        setAiFillMsg('Groq AI is reading the project idea...');

        try {
            const res = await fetch('/api/training/ideas/ai_fill_proposal.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: ideaId,
                    title,
                    description: proposal.description || proposal.problem_statement || title,
                    domain: category,
                    tech_stack: proposal.tech_stack || '',
                    problem_statement: proposal.problem_statement || '',
                    expected_output: proposal.expected_output || ''
                })
            });
            const data = await res.json();
            if (res.ok && data.success && data.proposal) {
                // Reveal pages one by one with a staggered animation
                const sections = data.proposal.sections || [];
                setProposal(data.proposal);
                setAiFillMsg('✨ Groq finished! Pages are appearing...');

                // Stagger-remove shimmer key by key as pages load
                sections.forEach((sec, idx) => {
                    setTimeout(() => {
                        setLoadingKeys(prev => {
                            const next = new Set(prev);
                            next.delete(sec.key);
                            return next;
                        });
                    }, idx * 120);
                });

                // Safety: clear ALL remaining keys after stagger finishes
                const clearDelay = sections.length * 120 + 600;
                setTimeout(() => setLoadingKeys(new Set()), clearDelay);

                setTimeout(() => setAiFillMsg(''), 4000);
            } else {
                alert(data.error || 'AI generation failed');
                setAiFillMsg('');
                setLoadingKeys(new Set());
            }
        } catch (e) {
            console.error(e);
            alert('Network error — could not reach Groq AI');
            setAiFillMsg('');
            setLoadingKeys(new Set());
        } finally {
            setAiFilling(false);
        }
    }, [ideaId, title, category, proposal, lang]);

    // Auto-trigger on mount if no AI content present
    useEffect(() => {
        if (!autoFillTriggered.current && !hasAIContent && ideaId) {
            autoFillTriggered.current = true;
            triggerAiFill(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSectionSaved = useCallback((key, newContent) => {
        setProposal(prev => {
            const sections = [...(prev.sections || [])];
            const idx = sections.findIndex(s => s.key === key);
            if (idx >= 0) {
                sections[idx] = { ...sections[idx], content: newContent, source: 'trainee_edit' };
            } else {
                const pageDef = NMU_PAGES.find(d => d.key === key);
                sections.push({ key, title: pageDef?.title || key, content: newContent, source: 'trainee_edit' });
            }
            return { ...prev, sections };
        });
    }, []);

    // Smooth scroll inside modal body (no hash jump)
    const scrollToPage = (key) => {
        const target = document.getElementById(`pdm-sec-${key}`);
        if (target && bodyRef.current) {
            const container = bodyRef.current;
            const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
            container.scrollTo({ top: offset - 20, behavior: 'smooth' });
        }
    };

    // TRUE PDF DOWNLOAD — jsPDF + html2canvas (no browser print dialog)
    const handleDownloadPDF = async () => {
        setPdfGenerating(true);
        setPdfProgress('Preparing document...');
        try {
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'), import('html2canvas')
            ]);
            const pages = document.querySelectorAll('.pdm-page-card');
            const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const A4W = 210, A4H = 297;

            for (let i = 0; i < pages.length; i++) {
                const el = pages[i];
                setPdfProgress(`Rendering page ${i + 1} of ${pages.length}...`);

                // Hide UI-only elements
                const noPrints = el.querySelectorAll('.no-print');
                noPrints.forEach(n => { n.dataset.prevDisp = n.style.display; n.style.display = 'none'; });

                const canvas = await html2canvas(el, {
                    scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
                    onclone: (doc) => {
                        const p = doc.querySelector('#' + el.id);
                        if (p) { p.style.boxShadow = 'none'; p.style.margin = '0'; }
                    }
                });
                noPrints.forEach(n => { n.style.display = n.dataset.prevDisp || ''; });

                // Scale canvas to fit A4 page
                const pxW  = canvas.width  / 2 * 0.264583;  // px → mm at 96dpi
                const pxH  = canvas.height / 2 * 0.264583;
                const scale = Math.min(A4W / pxW, A4H / pxH, 1);
                const imgW  = pxW * scale;
                const imgH  = pxH * scale;

                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG',
                    (A4W - imgW) / 2, (A4H - imgH) / 2, imgW, imgH);
            }

            const safe = title.replace(/[^\w\s]/g, '').replace(/\s+/g, '_').substring(0, 40);
            pdf.save(`NMU_Proposal_${safe}.pdf`);
            setPdfProgress('');
        } catch (err) {
            console.error('PDF error:', err);
            setPdfProgress('Error — falling back to print...');
            setTimeout(() => { window.print(); setPdfProgress(''); }, 600);
        } finally {
            setPdfGenerating(false);
        }
    };

    const handleEvaluate = async (status) => {
        if (status === 'rejected' && !showFeedback) { setShowFeedback(true); return; }
        setEvaluating(true);
        setEvalError('');
        try {
            const res  = await fetch('/api/training/ideas/evaluate.php', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ idea_id: ideaId, status, feedback }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setEvalSuccess(
                    status === 'approved'
                        ? (lang === 'ar' ? 'تم قبول المقترح بنجاح' : 'Proposal Accepted!')
                        : (lang === 'ar' ? 'تم رفض المقترح' : 'Proposal Rejected')
                );
                if (onEvaluated) onEvaluated(status);
                setTimeout(() => { if (onClose) onClose(); }, 2000);
            } else {
                setEvalError(data.error || 'Evaluation failed');
            }
        } catch {
            setEvalError('Network error during evaluation');
        } finally {
            setEvaluating(false);
        }
    };

    return (
        <div className="pdm-overlay" onClick={e => e.target === e.currentTarget && onClose && onClose()}>
            <div className="pdm-modal">

                {/* ── Top Bar ─────────────────────────────────────────── */}
                <div className="pdm-topbar no-print">
                    <div className="pdm-topbar-left">
                        <div className="pdm-topbar-icon"><FileText size={20} /></div>
                        <div>
                            <div className="pdm-topbar-label">NMU Field Training — Official Project Report</div>
                            <div className="pdm-topbar-title">{title}</div>
                        </div>
                    </div>
                    <div className="pdm-topbar-actions">
                        <div className="pdm-progress-pill">
                            <Layers size={13} />
                            <span>30 Official Pages</span>
                        </div>
                        <button
                            type="button"
                            className={`pdm-btn-ai-fill ${aiFilling ? 'loading' : ''}`}
                            onClick={() => triggerAiFill(hasAIContent)}
                            disabled={aiFilling || pdfGenerating}
                            title="Let Groq AI review the idea and fill all 30 pages"
                        >
                            {aiFilling
                                ? <><Loader2 size={15} className="spin" /><span>{aiFillMsg || 'Thinking...'}</span></>
                                : <><Sparkles size={15} /><span>{hasAIContent ? 'Regenerate with Groq' : 'Fill with Groq AI'}</span></>}
                        </button>
                        <button
                            type="button"
                            className={`pdm-btn-download ${pdfGenerating ? 'loading' : ''}`}
                            onClick={handleDownloadPDF}
                            disabled={pdfGenerating || aiFilling}
                            title="Download as PDF file (no print dialog)"
                        >
                            {pdfGenerating
                                ? <><Loader2 size={15} className="spin" /><span>{pdfProgress || 'Generating...'}</span></>
                                : <><Download size={15} /><span>Download PDF</span></>}
                        </button>
                        {ideaId && (
                            <a
                                href={`/api/training/ideas/proposal_docx.php?idea_id=${ideaId}`}
                                target="_blank" rel="noopener noreferrer"
                                className="pdm-btn-download"
                            >
                                <Download size={15} />
                                <span>.docx</span>
                            </a>
                        )}
                        <button type="button" className="pdm-close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {/* ── AI Status Banner ─────────────────────────────── */}
                {aiFilling && (
                    <div className="pdm-ai-status-bar no-print">
                        <Loader2 size={14} className="spin" />
                        <span>{aiFillMsg || 'Groq AI is working...'}</span>
                        <div className="pdm-ai-status-dots"><span/><span/><span/></div>
                    </div>
                )}
                {!aiFilling && aiFillMsg && (
                    <div className="pdm-ai-status-bar pdm-ai-status-done no-print">
                        <Sparkles size={14} />
                        <span>{aiFillMsg}</span>
                    </div>
                )}

                {/* ── Scrollable Document Container ───────────────────── */}
                <div className="pdm-body" ref={bodyRef}>
                    <div className="pdm-document-container" id="pdm-printable">

                        {/* ════ PAGE 01 — COVER PAGE ═══════════════════════ */}
                        <div id="pdm-sec-cover" className={`pdm-page-card pdm-page-cover ${aiFilling ? 'pdm-filling' : ''}`}>
                            <div className="pdm-cover-logo-row">
                                <div className="pdm-cover-logo-icon"><GraduationCap size={36} /></div>
                                <div className="pdm-cover-uni-text">
                                    <div className="pdm-cover-uni-main">New Mansoura University — Faculty of AI &amp; Robotics</div>
                                    <div className="pdm-cover-uni-sub">ERTH Field Training Center — Summer Workshop 2026</div>
                                </div>
                            </div>
                            <div className="pdm-cover-divider" />
                            <div className="pdm-doc-type-label">FIELD TRAINING PROJECT REPORT — OFFICIAL TEMPLATE</div>
                            <div className="pdm-category-badge-wrapper">
                                <span className={`pdm-category-badge ${category}`}>{catLabel}</span>
                            </div>
                            <h1 className="pdm-cover-title">{title}</h1>
                            <div className="pdm-cover-meta">
                                <div className="pdm-cover-meta-item">
                                    <User size={14} className="pdm-cover-meta-icon" />
                                    <div>
                                        <div className="pdm-cover-meta-label">Team Leader</div>
                                        <div className="pdm-cover-meta-value">{team.leader || 'Student Team Leader'}</div>
                                    </div>
                                </div>
                                {team.members && team.members.length > 0 && (
                                    <div className="pdm-cover-meta-item">
                                        <Users size={14} className="pdm-cover-meta-icon" />
                                        <div>
                                            <div className="pdm-cover-meta-label">Team Members</div>
                                            <div className="pdm-cover-meta-value">{team.members.join(', ')}</div>
                                        </div>
                                    </div>
                                )}
                                <div className="pdm-cover-meta-item">
                                    <Shield size={14} className="pdm-cover-meta-icon" />
                                    <div>
                                        <div className="pdm-cover-meta-label">Technical Trainer</div>
                                        <div className="pdm-cover-meta-value">{team.trainer || 'Supervising Trainer'}</div>
                                    </div>
                                </div>
                                <div className="pdm-cover-meta-item">
                                    <BookOpen size={14} className="pdm-cover-meta-icon" />
                                    <div>
                                        <div className="pdm-cover-meta-label">Training Course</div>
                                        <div className="pdm-cover-meta-value">{team.course || 'AI & Robotics Field Training'}</div>
                                    </div>
                                </div>
                                <div className="pdm-cover-meta-item">
                                    <Calendar size={14} className="pdm-cover-meta-icon" />
                                    <div>
                                        <div className="pdm-cover-meta-label">Date</div>
                                        <div className="pdm-cover-meta-value">{team.date || 'August 2026'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="pdm-page-footer pdm-cover-footer">
                                <span>Submitted in partial fulfillment of the AI &amp; Robotics Summer Field Training requirements.</span>
                                <span>Page 01</span>
                            </div>
                        </div>

                        {/* ════ PAGE 02 — APPROVAL PAGE ════════════════════ */}
                        <div id="pdm-sec-approval" className={`pdm-page-card pdm-page-approval ${aiFilling ? 'pdm-filling' : ''}`}>
                            <div className="pdm-page-header">
                                <div className="pdm-page-header-left">
                                    <div className="pdm-page-number-pill">PAGE 02 / 30</div>
                                    <div className="pdm-page-titles">
                                        <h2 className="pdm-page-heading">Approval Page</h2>
                                        <div className="pdm-page-subheading">Supervisor and training committee official approval</div>
                                    </div>
                                </div>
                                <div className="pdm-page-header-right no-print">
                                    <span className="pdm-section-badge pdm-badge-default">📄 Official Template</span>
                                    {!isEvaluator && !editingApproval && (
                                        <button
                                            type="button"
                                            className="pdm-edit-btn"
                                            onClick={() => {
                                                setDraftApproval({
                                                    trainer: team.trainer || '',
                                                    academic_supervisor: team.academic_supervisor || '',
                                                    program_coordinator: team.program_coordinator || '',
                                                    department_head: team.department_head || '',
                                                });
                                                setEditingApproval(true);
                                                setSaveApprovalOk(false);
                                                setSaveApprovalErr('');
                                            }}
                                            title="Edit committee and supervisor names"
                                        >
                                            <Pencil size={12} />
                                            <span>Edit Names</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="pdm-guidance-box no-print">
                                <div className="pdm-guidance-header">
                                    <Info size={14} />
                                    <strong>What to include on this page:</strong>
                                </div>
                                <p className="pdm-guidance-text">Complete all student and project information before printing. Obtain signatures after final presentation and technical review. Use original signatures; do not paste scanned signatures unless officially approved.</p>
                            </div>

                            {editingApproval ? (
                                <div className="pdm-edit-area no-print">
                                    <div className="pdm-approval-form-grid">
                                        <div className="pdm-form-group">
                                            <label className="pdm-form-label">Technical Trainer Name:</label>
                                            <input
                                                className="pdm-form-input"
                                                value={draftApproval.trainer}
                                                onChange={e => setDraftApproval(prev => ({ ...prev, trainer: e.target.value }))}
                                                placeholder="e.g., Supervising Trainer"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="pdm-form-group">
                                            <label className="pdm-form-label">Academic Supervisor Name:</label>
                                            <input
                                                className="pdm-form-input"
                                                value={draftApproval.academic_supervisor}
                                                onChange={e => setDraftApproval(prev => ({ ...prev, academic_supervisor: e.target.value }))}
                                                placeholder="e.g., Prof. Dr. Academic Supervisor"
                                            />
                                        </div>
                                        <div className="pdm-form-group">
                                            <label className="pdm-form-label">Program Coordinator Name:</label>
                                            <input
                                                className="pdm-form-input"
                                                value={draftApproval.program_coordinator}
                                                onChange={e => setDraftApproval(prev => ({ ...prev, program_coordinator: e.target.value }))}
                                                placeholder="e.g., Program Coordinator"
                                            />
                                        </div>
                                        <div className="pdm-form-group">
                                            <label className="pdm-form-label">Head of Department / Dean Name:</label>
                                            <input
                                                className="pdm-form-input"
                                                value={draftApproval.department_head}
                                                onChange={e => setDraftApproval(prev => ({ ...prev, department_head: e.target.value }))}
                                                placeholder="e.g., Head of Department / Dean"
                                            />
                                        </div>
                                    </div>
                                    {saveApprovalErr && <div className="pdm-save-err"><AlertCircle size={13} /> {saveApprovalErr}</div>}
                                    <div className="pdm-edit-actions">
                                        <button type="button" className="pdm-btn pdm-btn-approve" onClick={handleSaveApproval} disabled={savingApproval}>
                                            {savingApproval ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                                            <span>{savingApproval ? 'Saving...' : 'Save Names'}</span>
                                        </button>
                                        <button type="button" className="pdm-btn pdm-btn-ghost" onClick={() => setEditingApproval(false)} disabled={savingApproval}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="pdm-page-body">
                                    {saveApprovalOk && <div className="pdm-save-confirm no-print"><CheckSquare size={13} /> Committee names saved to database</div>}
                                    <table className="pdm-approval-table">
                                        <thead>
                                            <tr><th>Role</th><th>Name</th><th>Signature</th><th>Date</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td><strong>Technical Trainer</strong></td>
                                                <td><strong>{team.trainer || 'Supervising Trainer'}</strong></td>
                                                <td><span className="pdm-sig-line" /></td>
                                                <td><span className="pdm-sig-line" style={{ width: 80 }} /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Academic Supervisor</strong></td>
                                                <td>{team.academic_supervisor ? <strong>{team.academic_supervisor}</strong> : '_____________________________'}</td>
                                                <td><span className="pdm-sig-line" /></td>
                                                <td><span className="pdm-sig-line" style={{ width: 80 }} /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Program Coordinator</strong></td>
                                                <td>{team.program_coordinator ? <strong>{team.program_coordinator}</strong> : '_____________________________'}</td>
                                                <td><span className="pdm-sig-line" /></td>
                                                <td><span className="pdm-sig-line" style={{ width: 80 }} /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Head of Department / Dean</strong></td>
                                                <td>{team.department_head ? <strong>{team.department_head}</strong> : '_____________________________'}</td>
                                                <td><span className="pdm-sig-line" /></td>
                                                <td><span className="pdm-sig-line" style={{ width: 80 }} /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="pdm-page-footer">
                                <span>New Mansoura University — AI &amp; Robotics Field Training</span>
                                <span>Page 02</span>
                            </div>
                        </div>

                        {/* ════ PAGE 03 — STUDENT DECLARATION ══════════════ */}
                        {(() => {
                            const def = NMU_PAGES.find(p => p.key === 'declaration');
                            const sec = sectionMap['declaration'] || {};
                            return (
                                <PageCard
                                    key="declaration"
                                    pageDef={def}
                                    savedContent={sec.content}
                                    source={sec.source}
                                    ideaId={ideaId}
                                    onSave={handleSectionSaved}
                                    readOnly={isEvaluator}
                                    isLoading={loadingKeys.has('declaration')}
                                />
                            );
                        })()}

                        {/* ════ PAGE 04 — ACKNOWLEDGMENT ═══════════════════ */}
                        {(() => {
                            const def = NMU_PAGES.find(p => p.key === 'acknowledgment');
                            const sec = sectionMap['acknowledgment'] || {};
                            return (
                                <PageCard
                                    key="acknowledgment"
                                    pageDef={def}
                                    savedContent={sec.content}
                                    source={sec.source}
                                    ideaId={ideaId}
                                    onSave={handleSectionSaved}
                                    readOnly={isEvaluator}
                                    isLoading={loadingKeys.has('acknowledgment')}
                                />
                            );
                        })()}

                        {/* ════ PAGE 05 — EXECUTIVE SUMMARY / ABSTRACT ═════ */}
                        {(() => {
                            const def = NMU_PAGES.find(p => p.key === 'abstract');
                            const sec = sectionMap['abstract'] || {};
                            return (
                                <PageCard
                                    key="abstract"
                                    pageDef={def}
                                    savedContent={sec.content}
                                    source={sec.source}
                                    ideaId={ideaId}
                                    onSave={handleSectionSaved}
                                    readOnly={isEvaluator}
                                    isLoading={loadingKeys.has('abstract')}
                                />
                            );
                        })()}

                        {/* ════ PAGE 06 — TABLE OF CONTENTS ════════════════ */}
                        <div id="pdm-sec-toc" className={`pdm-page-card ${aiFilling ? 'pdm-filling' : ''}`}>
                            <div className="pdm-page-topbar">
                                <div className="pdm-page-topbar-left">
                                    <div className="pdm-nmu-emblem">NMU</div>
                                    <div className="pdm-page-topbar-text">
                                        <div className="pdm-page-topbar-uni">New Mansoura University — Faculty of AI &amp; Robotics</div>
                                        <div className="pdm-page-topbar-sub">ERTH Field Training Center · Summer Workshop</div>
                                    </div>
                                </div>
                                <div className="pdm-page-topbar-right">
                                    <div className="pdm-page-num-badge">PAGE 06 / 30</div>
                                </div>
                            </div>
                            <div className="pdm-gold-rule" />
                            <div className="pdm-title-row">
                                <div className="pdm-title-block">
                                    <h2 className="pdm-chapter-heading">Table of Contents</h2>
                                    <div className="pdm-section-subtitle">Complete report structure — click any entry to navigate</div>
                                </div>
                                <div className="pdm-title-actions no-print">
                                    <span className="pdm-section-badge pdm-badge-default">📄 Template</span>
                                </div>
                            </div>
                            <div className="pdm-page-body">
                                <div className="pdm-toc-grid">
                                    {NMU_PAGES.map((p) => (
                                        <div key={p.key} className="pdm-toc-row" onClick={() => scrollToPage(p.key)}>
                                            <span className="pdm-toc-num">{p.page}.</span>
                                            <span className="pdm-toc-title">{p.title}</span>
                                            <span className="pdm-toc-dots" />
                                            <span className="pdm-toc-page">Page {p.page}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pdm-page-footer">
                                <span>New Mansoura University — AI &amp; Robotics Field Training Report</span>
                                <span>Page 06 of 30</span>
                            </div>
                        </div>

                        {/* ════ PAGES 07 — 30 (ALL REMAINING CHAPTERS) ══════ */}
                        {NMU_PAGES.filter(p => !['cover', 'approval', 'declaration', 'acknowledgment', 'abstract', 'toc'].includes(p.key)).map((pageDef) => {
                            const sec = sectionMap[pageDef.key] || {};
                            return (
                                <PageCard
                                    key={pageDef.key}
                                    pageDef={pageDef}
                                    savedContent={sec.content}
                                    source={sec.source}
                                    ideaId={ideaId}
                                    onSave={handleSectionSaved}
                                    readOnly={isEvaluator}
                                    isLoading={loadingKeys.has(pageDef.key)}
                                />
                            );
                        })}

                    </div>
                </div>

                {/* ── Evaluator Decision Bar (Trainer/Admin Only) ─────── */}
                {isEvaluator && (
                    <div className="pdm-eval-bar no-print">
                        {evalSuccess ? (
                            <div className={`pdm-eval-success ${evalSuccess.includes('Reject') || evalSuccess.includes('رفض') ? 'reject' : 'approve'}`}>
                                <CheckCircle size={18} />
                                <span>{evalSuccess}</span>
                            </div>
                        ) : (
                            <>
                                <div className="pdm-eval-left">
                                    <Clock size={15} />
                                    <span>{lang === 'ar' ? 'قرار المشرف التقني:' : 'Trainer Evaluation Decision:'}</span>
                                </div>
                                <div className="pdm-eval-right">
                                    {showFeedback ? (
                                        <div className="pdm-feedback-row">
                                            <input
                                                className="pdm-feedback-input"
                                                placeholder={lang === 'ar' ? 'سبب الرفض أو ملاحظات التعديل...' : 'Rejection reason or review feedback...'}
                                                value={feedback}
                                                onChange={e => setFeedback(e.target.value)}
                                                autoFocus
                                            />
                                            <button type="button" className="pdm-btn pdm-btn-reject" onClick={() => handleEvaluate('rejected')} disabled={evaluating}>
                                                {evaluating ? <Loader2 size={15} className="spin" /> : <XCircle size={15} />}
                                                <span>{lang === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'}</span>
                                            </button>
                                            <button type="button" className="pdm-btn pdm-btn-ghost" onClick={() => setShowFeedback(false)} disabled={evaluating}>
                                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {evalError && <span className="pdm-eval-error"><AlertCircle size={14} /> {evalError}</span>}
                                            <button type="button" className="pdm-btn pdm-btn-reject" onClick={() => setShowFeedback(true)} disabled={evaluating}>
                                                <XCircle size={16} />
                                                <span>{lang === 'ar' ? 'رفض المقترح' : 'Reject'}</span>
                                            </button>
                                            <button type="button" className="pdm-btn pdm-btn-changes" onClick={() => handleEvaluate('changes_requested')} disabled={evaluating}>
                                                {evaluating ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
                                                <span>{lang === 'ar' ? 'طلب تعديلات' : 'Request Changes'}</span>
                                            </button>
                                            <button type="button" className="pdm-btn pdm-btn-approve" onClick={() => handleEvaluate('approved')} disabled={evaluating}>
                                                {evaluating ? <Loader2 size={15} className="spin" /> : <CheckCircle size={15} />}
                                                <span>{lang === 'ar' ? 'قبول واعتماد المقترح' : 'Accept Proposal'}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
