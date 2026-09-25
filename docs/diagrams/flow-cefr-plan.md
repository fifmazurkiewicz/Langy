# Langy — business flow: optional CEFR learning-plan generation

```mermaid
flowchart TD
    start([Learner requests a learning plan]) --> inputs[Load target level, goals and availability]
    inputs --> generate[Generate staged CEFR-aligned plan]
    generate --> review[Show plan and editable milestones]
    review --> accept{Learner accepts plan?}
    accept -- No --> adjust[Adjust goals or schedule]
    adjust --> inputs
    accept -- Yes --> save[Save plan and suggested next lessons]
    save --> end([Plan guides future practice])
```
