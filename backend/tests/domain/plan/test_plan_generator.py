from app.domain.plan.generator import days_per_week, generate_plan_grid


def test_days_per_week_mapping():
    assert days_per_week(4) == 5
    assert days_per_week(16) == 2


def test_plan_grid_total_days():
    grid = generate_plan_grid("A2", 4, "en-GB")
    assert grid["duration_weeks"] == 4
    assert grid["total_days"] == 20
    assert len(grid["weeks"]) == 4
