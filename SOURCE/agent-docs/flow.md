flowchart TD
    start([Course Created]) --> assign

    subgraph TA_PHASE["🟦 TA / Admin phase"]
        assign["assigned_to_ta"]
        review["ta_review_in_progress"]
        submitted["submitted_to_admin"]
        changes["admin_changes_requested"]
    end

    subgraph ADMIN_PHASE["🟩 Admin decision"]
        decision{"Admin reviews<br/>submission"}
    end

    subgraph STAGING_PHASE["🟧 Staging phase (NEW)"]
        waiting["waiting_on_admin<br/>(build staging shell)"]
        staging["staging_in_progress<br/>(TA finalizes)"]
    end

    subgraph COMMS_PHASE["🟨 Comms phase"]
        ready["ready_for_instructor"]
        sent["sent_to_instructor"]
    end

    subgraph INSTR_PHASE["🟪 Instructor phase"]
        idecision{"Instructor<br/>reviews"}
        questions["instructor_questions"]
        iapproved["instructor_approved"]
    end

    final(["final_approved ✅"])

    %% --- edges ---
    assign -->|"TA: start review"| review
    review -->|"TA: submit"| submitted
    submitted --> decision

    decision -->|"Admin: request fixes + note"| changes
    decision -->|"Admin: approve"| waiting
    changes -->|"TA: rework"| review

    waiting -->|"Admin: staging shell ready → push to TA"| staging
    staging -->|"TA: Course Complete / ready to send email"| ready

    ready -->|"Comms: send email"| sent
    sent --> idecision

    idecision -->|"Instructor: raise question<br/>(creates issue)"| questions
    idecision -->|"Instructor: approve"| iapproved
    questions -->|"Admin/Comms: resend / clarify"| sent

    iapproved -->|"Admin: final approval"| final

    %% --- styling by owning role ---
    classDef ta fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
    classDef admin fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef staging fill:#fde68a,stroke:#d97706,color:#78350f;
    classDef comms fill:#fef9c3,stroke:#ca8a04,color:#713f12;
    classDef instr fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    classDef done fill:#e9d5ff,stroke:#9333ea,color:#581c87;

    class assign,review,submitted,changes ta;
    class decision admin;
    class waiting,staging staging;
    class ready,sent comms;
    class idecision,questions,iapproved instr;
    class final done;
