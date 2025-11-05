import whisperx

device = "cpu" 
batch_size = 16 # reduce if low on GPU mem
compute_type = "int8" # change to "int8" if low on GPU mem (may reduce accuracy)

# load model
whisperx.load_model("small", device, compute_type=compute_type, language="en", threads=4)

# load aligner model
whisperx.load_align_model(language_code="en", device=device)
