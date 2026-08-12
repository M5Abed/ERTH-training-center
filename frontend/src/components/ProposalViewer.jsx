import { FileText, Target, Layers, Code2, GitBranch, AlertTriangle, CheckCircle2, BookOpen, Database, Users, Monitor, Zap, Cpu, FlaskConical, ShieldCheck, ListTodo, BookMarked, BarChart3 } from 'lucide-react';
import './ProposalViewer.css';

/**
 * ProposalViewer — Premium ERTH AI Proposal Document UI
 *
 * Supports both the new 30-chapter flat schema and the legacy 6-chapter nested schema.
 *
 * Props:
 *   proposal {object}  — the proposal object from the AI engine
 *   title    {string}  — optional override for the display title
 *   compact  {boolean} — render in a condensed mode
 */
export default function ProposalViewer({ proposal, title, compact = false }) {
    if (!proposal || (!proposal.project_identification && !proposal.title && !proposal.title_en && !proposal.executive_summary)) {
        return (
            <div className="pv-empty">
                <div className="pv-empty-icon"><FileText size={32} strokeWidth={1.2} /></div>
                <h4>No Proposal Generated Yet</h4>
                <p>Generate a full Erth AI proposal from the project submission form to see the complete 30-page documentation here.</p>
            </div>
        );
    }

    const isNewSchema = !!proposal.executive_summary;
    const displayTitle = title || proposal.title || proposal.project_identification?.title || 'Project Proposal';

    const renderList = (items, numbered = false) => {
        if (!Array.isArray(items) || items.length === 0) return <p className="pv-na">Not specified</p>;
        return (
            <ul className={`pv-list ${numbered ? 'pv-list-numbered' : ''}`}>
                {items.map((item, i) => (
                    <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                ))}
            </ul>
        );
    };

    const Chip = ({ label, color = 'purple' }) => (
        <span className={`pv-chip pv-chip-${color}`}>{label}</span>
    );

    const Card = ({ icon: Icon, label, children, accent, className = '' }) => (
        <div className={`pv-card ${accent ? 'pv-card-accent' : ''} ${className}`}>
            <div className="pv-card-header">
                <span className="pv-card-icon"><Icon size={14} /></span>
                <span className="pv-card-label">{label}</span>
            </div>
            <div className="pv-card-body">{children}</div>
        </div>
    );

    const InfoRow = ({ label, value }) => value ? (
        <div className="pv-info-row">
            <span className="pv-info-label">{label}</span>
            <span className="pv-info-value">{value}</span>
        </div>
    ) : null;

    return (
        <div className={`proposal-viewer ${compact ? 'pv-compact' : ''}`}>

            {/* ══ HERO HEADER ══ */}
            <div className="pv-hero">
                <div className="pv-hero-glow" />
                <div className="pv-hero-top">
                    <div className="pv-erth-badge">
                        <img src="/logo.png" alt="Erth" style={{ height: '14px' }} />
                        <span>ERTH AI · Project Proposal / Documentation</span>
                    </div>
                    <Chip label="30-Page NMU Template" color="blue" />
                </div>
                <h1 className="pv-hero-title">{displayTitle}</h1>

                {isNewSchema ? (
                    <div className="pv-hero-meta">
                        {proposal.platform && <InfoRow label="Platform" value={proposal.platform} />}
                        {proposal.training_track && <InfoRow label="Track" value={proposal.training_track} />}
                        {proposal.keywords?.length > 0 && (
                            <div className="pv-keywords">
                                {proposal.keywords.map((k, i) => <Chip key={i} label={k} color="indigo" />)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="pv-hero-meta">
                        {proposal.project_identification?.domain && <InfoRow label="Domain" value={proposal.project_identification.domain} />}
                        {proposal.project_identification?.target_audience && <InfoRow label="Target Audience" value={proposal.project_identification.target_audience} />}
                    </div>
                )}
            </div>

            {/* ══ NEW 30-CHAPTER SCHEMA ══ */}
            {isNewSchema ? (
                <div className="pv-body">

                    {/* Executive Summary */}
                    {proposal.executive_summary && (
                        <div className="pv-summary-block">
                            <div className="pv-summary-label"><BookOpen size={13} /> Executive Summary</div>
                            <p>{proposal.executive_summary}</p>
                        </div>
                    )}

                    {/* Stats Row */}
                    <div className="pv-stats-row">
                        {proposal.ch4_tech_stack && (
                            <div className="pv-stat-tile">
                                <Code2 size={18} className="pv-stat-icon" />
                                <div>
                                    <div className="pv-stat-label">Technology Stack</div>
                                    <div className="pv-stat-val">{proposal.ch4_tech_stack.split(',').length} Technologies</div>
                                </div>
                            </div>
                        )}
                        {Array.isArray(proposal.ch3_functional_requirements) && (
                            <div className="pv-stat-tile">
                                <ListTodo size={18} className="pv-stat-icon" />
                                <div>
                                    <div className="pv-stat-label">Functional Requirements</div>
                                    <div className="pv-stat-val">{proposal.ch3_functional_requirements.length} Requirements</div>
                                </div>
                            </div>
                        )}
                        {Array.isArray(proposal.ch6_test_cases) && (
                            <div className="pv-stat-tile">
                                <FlaskConical size={18} className="pv-stat-icon" />
                                <div>
                                    <div className="pv-stat-label">Test Cases</div>
                                    <div className="pv-stat-val">{proposal.ch6_test_cases.length} Cases Defined</div>
                                </div>
                            </div>
                        )}
                        {proposal.ch5_scenario && (
                            <div className="pv-stat-tile">
                                <ShieldCheck size={18} className="pv-stat-icon" />
                                <div>
                                    <div className="pv-stat-label">Validation</div>
                                    <div className="pv-stat-val">Production-Ready</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Problem & Gap */}
                    {(proposal.ch3_problem_statement || proposal.ch2_gap) && (
                        <div className="pv-section-group">
                            <div className="pv-section-group-label"><Target size={13} /> Problem Definition & Research Gap</div>
                            <div className="pv-two-col">
                                {proposal.ch3_problem_statement && (
                                    <Card icon={Target} label="Problem Statement" accent>
                                        <p>{proposal.ch3_problem_statement}</p>
                                    </Card>
                                )}
                                {proposal.ch2_gap && (
                                    <Card icon={BookMarked} label="Research / Design Gap">
                                        <p>{proposal.ch2_gap}</p>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Architecture & Stack */}
                    {(proposal.ch4_tech_stack || proposal.ch4_system_architecture) && (
                        <div className="pv-section-group">
                            <div className="pv-section-group-label"><Cpu size={13} /> System Architecture & Technology</div>
                            <div className="pv-two-col">
                                {proposal.ch4_tech_stack && (
                                    <Card icon={Code2} label="Technology Stack">
                                        <div className="pv-tech-chips">
                                            {proposal.ch4_tech_stack.split(',').map((t, i) => (
                                                <Chip key={i} label={t.trim()} color="indigo" />
                                            ))}
                                        </div>
                                    </Card>
                                )}
                                {proposal.ch4_system_architecture && (
                                    <Card icon={GitBranch} label="System Architecture">
                                        <p>{proposal.ch4_system_architecture}</p>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Functional Requirements */}
                    {Array.isArray(proposal.ch3_functional_requirements) && proposal.ch3_functional_requirements.length > 0 && (
                        <div className="pv-section-group">
                            <div className="pv-section-group-label"><ListTodo size={13} /> Functional Requirements</div>
                            <div className="pv-req-grid">
                                {proposal.ch3_functional_requirements.map((fr, idx) => (
                                    <div key={idx} className="pv-req-card">
                                        <div className="pv-req-id">
                                            <span className="pv-req-num">{fr.id || `FR-${idx + 1}`}</span>
                                            <span className={`pv-req-priority pv-req-priority-${(fr.priority || 'MEDIUM').toLowerCase()}`}>{fr.priority || 'MEDIUM'}</span>
                                        </div>
                                        <p className="pv-req-text">{fr.requirement}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success Criteria */}
                    {Array.isArray(proposal.ch3_success_criteria) && proposal.ch3_success_criteria.length > 0 && (
                        <Card icon={CheckCircle2} label="Success Criteria & KPIs">
                            <div className="pv-criteria-grid">
                                {proposal.ch3_success_criteria.map((c, i) => (
                                    <div key={i} className="pv-criteria-item">
                                        <CheckCircle2 size={14} className="pv-criteria-icon" />
                                        <span>{c}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Scenario */}
                    {proposal.ch5_scenario && (
                        <Card icon={Monitor} label="Application Scenario & Implementation">
                            <p>{proposal.ch5_scenario}</p>
                        </Card>
                    )}

                    {/* Test Cases */}
                    {Array.isArray(proposal.ch6_test_cases) && proposal.ch6_test_cases.length > 0 && (
                        <div className="pv-section-group">
                            <div className="pv-section-group-label"><FlaskConical size={13} /> Test Cases</div>
                            <div className="pv-test-grid">
                                {proposal.ch6_test_cases.map((tc, i) => (
                                    <div key={i} className="pv-test-card">
                                        <div className="pv-test-header">
                                            <span className="pv-test-id">{tc.id || `TC-${i + 1}`}</span>
                                            <span className={`pv-test-status ${tc.status === 'Pass' ? 'pass' : 'pending'}`}>
                                                {tc.status === 'Pass' ? '✓ PASS' : '● PENDING'}
                                            </span>
                                        </div>
                                        <p className="pv-test-name">{tc.test}</p>
                                        <div className="pv-test-expected"><strong>Expected:</strong> {tc.expected}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            ) : (
                /* ══ LEGACY 6-CHAPTER SCHEMA ══ */
                <div className="pv-body">
                    {proposal.project_identification?.scope && (
                        <div className="pv-summary-block">
                            <div className="pv-summary-label"><BookOpen size={13} /> Scope & System Boundaries</div>
                            <p>{proposal.project_identification.scope}</p>
                        </div>
                    )}

                    {proposal.problem_statement && (
                        <div className="pv-section-group">
                            <div className="pv-section-group-label"><Target size={13} /> Problem Statement & Context</div>
                            <div className="pv-three-col">
                                {proposal.problem_statement.pain_points && (
                                    <Card icon={AlertTriangle} label="Pain Points" accent>
                                        <p>{proposal.problem_statement.pain_points}</p>
                                    </Card>
                                )}
                                {(proposal.problem_statement.existing_solutions_limitations || proposal.problem_statement.existing_limitations) && (
                                    <Card icon={ShieldCheck} label="Existing Limitations">
                                        <p>{proposal.problem_statement.existing_solutions_limitations || proposal.problem_statement.existing_limitations}</p>
                                    </Card>
                                )}
                                {proposal.problem_statement.proposed_novelty && (
                                    <Card icon={Zap} label="Proposed Novelty">
                                        <p>{proposal.problem_statement.proposed_novelty}</p>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}

                    {proposal.technical_stack && (
                        <Card icon={Code2} label="Tailored Technology Stack">
                            <div className="pv-legacy-stack-grid">
                                {proposal.technical_stack.frontend && (
                                    <div className="pv-stack-row"><Monitor size={13} /><strong>Frontend:</strong><span>{proposal.technical_stack.frontend}</span></div>
                                )}
                                {proposal.technical_stack.backend && (
                                    <div className="pv-stack-row"><Zap size={13} /><strong>Backend:</strong><span>{proposal.technical_stack.backend}</span></div>
                                )}
                                {proposal.technical_stack.database && (
                                    <div className="pv-stack-row"><Database size={13} /><strong>Database:</strong><span>{proposal.technical_stack.database}</span></div>
                                )}
                                {(proposal.technical_stack.cloud_devops || proposal.technical_stack.infrastructure) && (
                                    <div className="pv-stack-row"><Layers size={13} /><strong>DevOps:</strong><span>{proposal.technical_stack.cloud_devops || proposal.technical_stack.infrastructure}</span></div>
                                )}
                                {(proposal.technical_stack.ai_third_party || proposal.technical_stack.ai_apis) && (
                                    <div className="pv-stack-row"><Cpu size={13} /><strong>AI / APIs:</strong><span>{proposal.technical_stack.ai_third_party || proposal.technical_stack.ai_apis}</span></div>
                                )}
                            </div>
                            {proposal.technical_stack.justification && (
                                <div className="pv-justification-box">
                                    <strong>Architecture Justification:</strong>
                                    <p>{proposal.technical_stack.justification}</p>
                                </div>
                            )}
                        </Card>
                    )}

                    {proposal.requirements && (
                        <div className="pv-two-col">
                            <Card icon={Users} label="Functional Requirements">
                                {Array.isArray(proposal.requirements.functional) ? proposal.requirements.functional.map((fr, idx) => (
                                    <div key={idx} className="pv-legacy-role-block">
                                        <strong>Role: {fr.role}</strong>
                                        {renderList(fr.requirements)}
                                    </div>
                                )) : <p className="pv-na">—</p>}
                            </Card>
                            <Card icon={CheckCircle2} label="Non-Functional Requirements">
                                {renderList(proposal.requirements.non_functional)}
                            </Card>
                        </div>
                    )}

                    {proposal.system_architecture && (
                        <Card icon={GitBranch} label="System Architecture & Database Design">
                            <div className="pv-two-col" style={{ marginBottom: '1rem' }}>
                                {proposal.system_architecture.high_level_pattern || proposal.system_architecture.pattern ? (
                                    <div><strong>High-Level Pattern:</strong><p style={{ marginTop: '4px' }}>{proposal.system_architecture.high_level_pattern || proposal.system_architecture.pattern}</p></div>
                                ) : null}
                                {proposal.system_architecture.data_flow ? (
                                    <div><strong>Data Flow:</strong><p style={{ marginTop: '4px' }}>{proposal.system_architecture.data_flow}</p></div>
                                ) : null}
                            </div>
                            <div className="pv-two-col" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                                {(proposal.system_architecture.er_diagram_entities || proposal.system_architecture.er_entities) ? (
                                    <div><strong style={{ marginBottom: '8px', display: 'block' }}>ER Entities:</strong>{renderList(proposal.system_architecture.er_diagram_entities || proposal.system_architecture.er_entities)}</div>
                                ) : null}
                                {proposal.system_architecture.api_endpoints ? (
                                    <div><strong style={{ marginBottom: '8px', display: 'block' }}>Core API Endpoints:</strong>{renderList(proposal.system_architecture.api_endpoints)}</div>
                                ) : null}
                            </div>
                        </Card>
                    )}

                    {proposal.implementation_roadmap && (
                        <>
                            {Array.isArray(proposal.implementation_roadmap.phases) && (
                                <Card icon={Layers} label="Implementation Phases & Roadmap">
                                    <div className="pv-phases">
                                        {proposal.implementation_roadmap.phases.map((phase, i) => (
                                            <div key={i} className="pv-phase-card">
                                                <div className="pv-phase-header">
                                                    <span className="pv-phase-num">{i + 1}</span>
                                                    <div>
                                                        <h5>{phase.phase}</h5>
                                                        {phase.duration && <span className="pv-phase-duration">⏳ {phase.duration}</span>}
                                                    </div>
                                                </div>
                                                {phase.deliverable && <p className="pv-phase-deliverable">📦 {phase.deliverable}</p>}
                                                {Array.isArray(phase.tasks) && (
                                                    <ul className="pv-phase-tasks">
                                                        {phase.tasks.map((t, ti) => <li key={ti}>{t}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {Array.isArray(proposal.implementation_roadmap.risk_management) && (
                                <Card icon={AlertTriangle} label="Risk Management Matrix">
                                    <div className="pv-risks">
                                        {proposal.implementation_roadmap.risk_management.map((risk, i) => (
                                            <div key={i} className="pv-risk-row">
                                                <AlertTriangle size={15} className="pv-risk-icon" />
                                                <div>
                                                    <span className="pv-risk-name">{risk.risk}</span>
                                                    <p className="pv-risk-mitigation"><strong>Mitigation:</strong> {risk.mitigation}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ══ FOOTER ══ */}
            <div className="pv-footer">
                <span>Generated by ERTH AI · NMU Field Training Documentation Engine</span>
                <span className="pv-footer-dot">·</span>
                <span>30-Page University Template</span>
            </div>
        </div>
    );
}
