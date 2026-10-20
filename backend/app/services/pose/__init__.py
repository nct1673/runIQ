"""Side-view running-form pipeline, ported from the 4_poseclean.ipynb draft.

video -> extract -> clean -> events -> metrics. Every function here is pure
(DataFrame in, DataFrame/values out): no database, no HTTP. The glue lives in
app.services.video_analysis_service.analyze.
"""
