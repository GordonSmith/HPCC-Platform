FROM hpccsystems/platform-build-base-centos-7:hpcc-platform-9.8.x

RUN yum install -y \
    rpm-build && \
    yum -y clean all && rm -rf /var/cache 

ENTRYPOINT ["/bin/bash", "--login", "-c"]

CMD ["/bin/bash"]
