# - [llama3.2-vision](https://ollama.com/library/llama3.2-vision)
# - [OCR App with Ollama and Llama Vision - Install Locally](https://www.youtube.com/watch?v=x8J6rp7eZzA)
# - [git LLama3.2-OCR](https://github.com/patchy631/ai-engineering-hub/tree/main/llama-ocr)

# ollama pull llama3.2-vision
# cd /tmp/uv_environments
# source my_env_3129/bin/activate
# uv pip install -U ipykernel streamlit ollama

# cd /tmp/uv_environments; source my_env_3129/bin/activate
# uv run streamlit run /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/notebooks/llama3.2-vision/teste.py

import streamlit as st
import ollama
from PIL import Image
import io

# Page configuration
st.set_page_config(
    page_title="Llama OCR",
    page_icon="🦙",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Title and description in main area
st.title("🦙 Llama OCR")

# Add clear button to top right
col1, col2 = st.columns([6,1])
with col2:
    if st.button("Clear 🗑️"):
        if 'ocr_result' in st.session_state:
            del st.session_state['ocr_result']
        st.rerun()

st.markdown('<p style="margin-top: -20px;">Extract structured text from images using Llama 3.2 Vision!</p>', unsafe_allow_html=True)
st.markdown("---")

# Move upload controls to sidebar
with st.sidebar:
    st.header("Upload Image")
    uploaded_file = st.file_uploader("Choose an image...", type=['png', 'jpg', 'jpeg'])
    
    if uploaded_file is not None:
        # Display the uploaded image
        image = Image.open(uploaded_file)
        st.image(image, caption="Uploaded Image")
        
        # """Analyze the text in the provided image. Extract all readable content
        #    and present it in a structured Markdown format that is clear, concise, 
        #    and well-organized. Ensure proper formatting (e.g., headings, lists, or
        #    code blocks) as necessary to represent the content effectively."""

        if st.button("Extract Text 🔍", type="primary"):
            with st.spinner("Processing image..."):
                try:
                    response = ollama.chat(
                        model='llama3.2-vision',
                        messages=[{
                            'role': 'user',
                            'content': """Extract the text in the provided image. Extract all readable content
                                        and present it in a structured Markdown format that is clear, concise, 
                                        and well-organized. Ensure proper formatting (e.g., headings, lists, or
                                        code blocks) as necessary to represent the content effectively. Do not
                                        explain the image or anything, I want only the TEXT. Please don't do any
                                        processing thinkg about what is the image, ou provide any context, code
                                        or correlate about the image. I want only the text. Please, don't add any
                                        comment about the image, return only the text if it's visible, ignore
                                        all that is not text. I want that you do an OCR
                                        """,
                            'images': [uploaded_file.getvalue()]
                        }]
                    )
                    st.session_state['ocr_result'] = response.message.content
                except Exception as e:
                    st.error(f"Error processing image: {str(e)}")

# Main content area for results
if 'ocr_result' in st.session_state:
    st.markdown(st.session_state['ocr_result'])
else:
    st.info("Upload an image and click 'Extract Text' to see the results here.")

# Footer
st.markdown("---")
st.markdown("Made with ❤️ using Llama Vision Model2 | [Report an Issue](https://github.com/patchy631/ai-engineering-hub/issues)")