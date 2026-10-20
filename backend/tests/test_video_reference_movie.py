"""A QuickTime "reference movie" starts with a valid ftyp atom, contains no
media of its own, and declares that its samples live in another file. If
ffmpeg ever followed that reference, an upload could read sibling files in
data/video_uploads/. It doesn't (the mov demuxer's -enable_drefs defaults to
off); this test fails if an ffmpeg upgrade changes that.
"""
import shutil
import struct
import subprocess

import pytest

from app.services.video_analysis_service import FFMPEG_INPUT_GUARD, looks_like_video

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")

CONTAINERS = {b"moov", b"trak", b"mdia", b"minf", b"dinf"}


def _atoms(buf: bytes):
    i = 0
    while i + 8 <= len(buf):
        size, typ = struct.unpack(">I4s", buf[i : i + 8])
        yield typ, buf[i + 8 : i + size]
        i += size


def _box(typ: bytes, payload: bytes) -> bytes:
    return struct.pack(">I4s", 8 + len(payload), typ) + payload


def _make_reference_movie(src_mp4: bytes, external_name: str) -> bytes:
    """ftyp + moov copied from src, with dref rewritten as an external
    'url ' reference to `external_name` and no mdat."""

    def rewrite(typ: bytes, payload: bytes) -> bytes:
        if typ in CONTAINERS:
            return _box(typ, b"".join(rewrite(t, p) for t, p in _atoms(payload)))
        if typ == b"dref":
            ver_flags, _count = struct.unpack(">II", payload[:8])
            entry = _box(b"url ", struct.pack(">I", 0) + external_name.encode() + b"\0")
            return _box(b"dref", struct.pack(">II", ver_flags, 1) + entry)
        return _box(typ, payload)

    top = list(_atoms(src_mp4))
    ftyp = next(p for t, p in top if t == b"ftyp")
    moov = next(p for t, p in top if t == b"moov")
    return _box(b"ftyp", ftyp) + rewrite(b"moov", moov)


def _frame_lines(path) -> list[str]:
    out = subprocess.run(
        ["ffmpeg", "-v", "quiet", *FFMPEG_INPUT_GUARD, "-i", str(path),
         "-map", "0:v:0", "-c", "copy", "-f", "framecrc", "-"],
        capture_output=True, text=True, timeout=60,
    ).stdout
    return [line for line in out.splitlines() if line and not line.startswith("#")]


def test_reference_movie_cannot_read_a_sibling_file(tmp_path) -> None:
    victim = tmp_path / "victim.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=duration=1:size=160x120:rate=10",
         "-pix_fmt", "yuv420p", "-c:v", "libx264", "-movflags", "+faststart", str(victim)],
        check=True, timeout=60,
    )
    evil = tmp_path / "evil.mov"
    evil.write_bytes(_make_reference_movie(victim.read_bytes(), "victim.mp4"))

    assert _frame_lines(victim), "control: the victim itself must be readable"
    # Passes the cheap header check -- which is why the demuxer setting matters.
    assert looks_like_video(evil, ".mov")
    # ...but no sample data from the referenced sibling file comes through.
    assert _frame_lines(evil) == []
