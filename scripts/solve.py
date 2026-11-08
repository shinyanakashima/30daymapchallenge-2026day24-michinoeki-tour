"""Shortest round trip (by driving time) through all stations.

Two solvers are run on the same asymmetric travel-time matrix and the shorter
tour is kept:
- Google OR-Tools routing solver, guided local search, several first-solution
  strategies with a time limit for each;
- LKH-3 (Lin-Kernighan-Helsgaun) through the elkai package.
Neither proves optimality; the result is the best tour found.

The loop is solved over the stations only. A start point is then joined to the
loop between the two consecutive stations where the detour is smallest, so the
order of stations is the same whichever start point is chosen.

usage: python scripts/solve.py [time_limit_seconds_per_run]
"""
import json
import pathlib
import sys
import time

import elkai
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = ROOT / "data" / "work"

STRATEGIES = [
    routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC,
    routing_enums_pb2.FirstSolutionStrategy.CHRISTOFIDES,
    routing_enums_pb2.FirstSolutionStrategy.SAVINGS,
    routing_enums_pb2.FirstSolutionStrategy.LOCAL_CHEAPEST_INSERTION,
]


def solve(cost, limit, strategy):
    n = len(cost)
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)
    cb = routing.RegisterTransitCallback(
        lambda i, j: cost[manager.IndexToNode(i)][manager.IndexToNode(j)])
    routing.SetArcCostEvaluatorOfAllVehicles(cb)
    p = pywrapcp.DefaultRoutingSearchParameters()
    p.first_solution_strategy = strategy
    p.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    p.time_limit.seconds = limit
    sol = routing.SolveWithParameters(p)
    idx, order = routing.Start(0), []
    while not routing.IsEnd(idx):
        order.append(manager.IndexToNode(idx))
        idx = sol.Value(routing.NextVar(idx))
    return order


def tour_cost(order, m):
    return sum(m[order[k]][order[(k + 1) % len(order)]] for k in range(len(order)))


def main(limit):
    mx = json.loads((WORK / "matrix.json").read_text())
    n = mx["n_stations"]
    dur = mx["durations"]
    cost = [[int(round(dur[i][j] * 10)) for j in range(n)] for i in range(n)]
    best, runs = None, []
    t0 = time.time()
    for s in STRATEGIES:
        order = solve(cost, limit, s)
        c = tour_cost(order, dur)
        runs.append({"strategy": routing_enums_pb2.FirstSolutionStrategy.Value.Name(s), "duration_s": round(c, 1)})
        print(runs[-1])
        if best is None or c < best[1]:
            best = (order, c)
    lkh_runs = 1000
    t1 = time.time()
    tour = elkai.DistanceMatrix([[0 if i == j else cost[i][j] for j in range(n)] for i in range(n)]).solve_tsp(runs=lkh_runs)
    tour = tour[:-1] if tour[0] == tour[-1] else tour
    assert sorted(tour) == list(range(n))
    c = tour_cost(tour, dur)
    runs.append({"strategy": f"LKH-3 via elkai, {lkh_runs} runs", "duration_s": round(c, 1),
                 "seconds": round(time.time() - t1, 1)})
    print(runs[-1])
    if c < best[1]:
        best = (tour, c)
    order = best[0]
    # Fixed direction and rotation for stable output: start the list at station 0.
    k0 = order.index(0)
    order = order[k0:] + order[:k0]
    # Join each start point at its cheapest position on the loop.
    starts = {}
    for k, sid in enumerate(mx["starts"]):
        s = n + k
        best_ins = None
        for pos in range(n):
            a, b = order[pos], order[(pos + 1) % n]
            extra = dur[a][s] + dur[s][b] - dur[a][b]
            if best_ins is None or extra < best_ins[0]:
                best_ins = (extra, pos, a, b)
        extra, pos, a, b = best_ins
        starts[sid] = {"after_pos": pos, "extra_duration_s": round(extra, 1),
                       "extra_distance_m": round(mx["distances"][a][s] + mx["distances"][s][b] - mx["distances"][a][b], 1)}
    out = {
        "order": order,
        "loop_duration_s": round(tour_cost(order, dur), 1),
        "loop_distance_m": round(tour_cost(order, mx["distances"]), 1),
        "starts": starts,
        "solver": {"objective": "driving time (OSRM car profile)",
                   "ortools_metaheuristic": "GUIDED_LOCAL_SEARCH", "time_limit_per_run_s": limit,
                   "lkh_runs": lkh_runs,
                   "best": min(runs, key=lambda r: r["duration_s"])["strategy"],
                   "runs": runs, "wall_time_s": round(time.time() - t0, 1)},
    }
    (WORK / "tour.json").write_text(json.dumps(out, indent=1))
    print("loop", out["loop_distance_m"] / 1000, "km", out["loop_duration_s"] / 3600, "h")
    print(starts)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 300)
